import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { filter, fromEvent, map, switchMap, tap } from 'rxjs';
import { SatWorkerService, WorkTypeEnum } from 'sat-worker';


enum GrTypeEnum
{
  line = 1,
  polygon = 2,
}
interface IRect
{
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface IPoint { x: number; y: number; }
interface IPrimitive
{
  coords: IPoint[];
  rect: IRect;
  name: string,
  type: GrTypeEnum
}

let gsss: IPrimitive[] = [];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit
{
  @ViewChild('canvas') canvas!: ElementRef
  private ctx: CanvasRenderingContext2D | null = null;
  private center!: { x: number, y: number };
  private scale = 4;

  constructor(private httpClient: HttpClient, private s_worker: SatWorkerService) { }

  ngOnInit(): void
  {

  }

  ngAfterViewInit(): void
  {
    fromEvent(this.canvas.nativeElement, 'mousedown')
      .pipe(
        map(me=> me as MouseEvent),
        filter(me => me.buttons === 1),
        map(me => { return { x: me.x, y: me.y } }),
        switchMap(position =>
        {
          const center = { ...this.center };
          return fromEvent(this.canvas.nativeElement, 'mousemove')
            .pipe(
              map(me=> me as MouseEvent),
              filter(me => me.buttons === 1),
              map((me: any) => { return { position, center, x: me.x, y: me.y }; })
            );
        }))
      .subscribe({
        next: arg =>
        {
          const dx = arg.x - arg.position.x;
          const dy = arg.y - arg.position.y;
          this.center = {
            x: arg.center.x - dx / this.scale,
            y: arg.center.y + dy / this.scale
          }

          this.draw();
        }
      });


    fromEvent(this.canvas.nativeElement, 'mousewheel').subscribe({
      next: (me: any) =>
      {
        const delta = me.deltaY || me.detail || me.wheelDelta;

        this.scale *= (delta > 0) ? 0.9 : 1.1;
        this.draw();
      }
    });


    this.canvas.nativeElement.height = 500;
    this.canvas.nativeElement.width = 500;
    this.ctx = this.canvas.nativeElement.getContext('2d');
    const mapRect: IRect = { left: 1550, bottom: 400, right: 2800, top: 4000 };
    this.center = { x: (mapRect.right + mapRect.left) / 2, y: (mapRect.top + mapRect.bottom) / 2 };

    this.httpClient.get<IPrimitive[]>('/assets/primitives.json')
      .subscribe({
        next: gs =>
        {
          this.draw(gs);
        }
      });
  }

  isFirst = true;
  private draw(gs: IPrimitive[] | undefined = undefined): void
  {
    console.time('draw_processing');

    let ags: IPrimitive[] | undefined = undefined;
    if (this.isFirst)
    {
      ags = gs;
      this.isFirst = false;
    }

    const w2 = (500 / this.scale) / 2;
    const h2 = (500 / this.scale) / 2;

    const rect: IRect =
    {
      left: this.center.x - w2,
      bottom: this.center.y - h2,
      right: this.center.x + w2,
      top: this.center.y + h2
    };

    this.s_worker.work((arg: { prs: IPrimitive[] | undefined, scale: number, rect: IRect }): IPrimitive[] =>
    {
      const result: IPrimitive[] = [];

      if (!!arg.prs) (self as any).primitives = arg.prs;

      const prs = (self as any).primitives as IPrimitive[];

      prs
        .filter(p =>
          p.rect.left < arg.rect.right &&
          p.rect.bottom < arg.rect.top &&
          p.rect.right > arg.rect.left &&
          p.rect.top > arg.rect.bottom)
        .forEach(p =>
          result.push({
            name: p.name,
            rect: p.rect,
            type: p.type,
            coords: p.coords
              .map(c =>
              {
                return {
                  x: (c.x - arg.rect.left) * arg.scale,
                  y: 500 - (c.y - arg.rect.bottom) * arg.scale
                };
              })
          }
          ));

      return result;
    },
      // Аргумент функции фонового процесса
      { prs: ags, scale: this.scale, rect },
      // Опции запуска фонового процесса
      { workType: WorkTypeEnum.serialLast })
      .subscribe({
        next: prs =>
        {
          console.timeEnd('draw_processing');
          this.draw2Canvas(prs);
        }
      });
  }

  /** Отрисовка на поверхности */
  private draw2Canvas(prs: IPrimitive[])
  {
    this.ctx?.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    this.ctx?.beginPath();
    prs.forEach(g =>
    {
      this.ctx?.moveTo(g.coords[0].x, g.coords[0].y);
      for (let i = 1; i < g.coords.length; i++)
        this.ctx?.lineTo(g.coords[i].x, g.coords[i].y);

      if (g.type == GrTypeEnum.polygon)
        this.ctx?.lineTo(g.coords[0].x, g.coords[0].y);
    });
    this.ctx?.stroke();
  }

}
