# SATAuth Библиотека запуска процесса в фоне. 

[Исходный код библиотеки](https://github.com/AlexanderZhelnin/angular-sat-worker-lib)

[![Видео](https://img.youtube.com/vi/8ZTWU62bFAM/0.jpg)](https://youtu.be/8ZTWU62bFAM)

####главный модуль
```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { ISATWorker, SATWORKER_OPTIONS } from 'sat-worker';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    .....
  ],
  imports: [
    .....    
  ],
  providers: [
    .....
    // свойства фоновых процессов
    { provide: SATWORKER_OPTIONS, useValue: new BehaviorSubject<ISATWorker>({ isAsync: true }) }
    .....
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

####Пример
```ts
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
```

