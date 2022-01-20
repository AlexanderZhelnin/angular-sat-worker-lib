import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { ISATWorker, SATWORKER_OPTIONS } from 'sat-worker';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,

  ],
  providers: [
    { provide: SATWORKER_OPTIONS, useValue: new BehaviorSubject<ISATWorker>({ isAsync: true }) }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
