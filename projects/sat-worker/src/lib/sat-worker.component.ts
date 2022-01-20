import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { SatWorkerService } from './sat-worker.service';

@Component({
  selector: 'lib-sat-worker',
  template: `
    <p>
      sat-worker works!
    </p>
    <button>srgv</button>
  `,
  styles: [
  ]
})
export class SatWorkerComponent implements OnInit
{

  constructor(private s_worker: SatWorkerService) { }

  async ngOnInit()
  {
    const f = (a: string): string =>
    {
      console.log('work');

      const start = Date.now();
      while (Date.now() < start + 5000)
      {
      }
      return a.toUpperCase();
    };

    for (let i = 1; i < 10; i++)
      this.s_worker.work(f, `Проверка${i}`).subscribe({ next: v => console.log(v) });

    setTimeout(() =>
    {
      this.s_worker.work(f, 'Проверка_').subscribe({ next: v => console.log(v) });
    }, 6000);

  }

}
