import { Component } from '@angular/core';
import { SatWorkerService } from 'sat-worker';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent
{
  title = 'angular-webworker';

  constructor(private s_worker: SatWorkerService) { }


  ngOnInit()
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
