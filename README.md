# SATAuth Библиотека запуска процесса в фоне. 

[Исходный код](https://github.com/AlexanderZhelnin/angular-sat-worker-lib)


```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { ISATWorker, SatWorkerModule, SATWORKER_OPTIONS } from 'sat-worker';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    .....
  ],
  imports: [
    .....
    SatWorkerModule
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
