import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { BehaviorSubject, from, Observable, Subject, switchMap } from 'rxjs';


export interface ISATWorker
{
  isAsync: boolean
}
interface IWorker
{
  isWork: boolean,
  //lastDate: number;
  worker: Worker
}

/** Токен свойств */
export const SATWORKER_OPTIONS = new InjectionToken<Observable<ISATWorker>>('SATWORKER_OPTIONS');

@Injectable({ providedIn: 'root' })
export class SatWorkerService
{
  /** Свойства сервиса фоновых процессов */
  private options: Observable<ISATWorker>;
  private dWorkers = new Map<string, IWorker[]>();
  /** Флаг показывающий поддержку фоновых процессов */
  private canWorkers = true;

  constructor(@Optional() @Inject(SATWORKER_OPTIONS) options: Observable<ISATWorker>)
  {
    this.options = options ?? new BehaviorSubject({ isAsync: true });
    this.canWorkers = typeof Worker !== 'undefined';
  }

  /** Запуск фонового процесса */
  public work<T, K>(fn: (v: K) => T, data: any = undefined): Observable<T>
  {
    return this.options.pipe(switchMap(o =>
      (o.isAsync && this.canWorkers)
        ? this.workAsync<T, K>(fn, data)
        : new BehaviorSubject(fn(data))
    ));
  }

  // Запуска функции в фоне
  private workAsync<T, K>(fn: (v: K) => T, data: K | undefined = undefined): Observable<T>
  {
    const result = new Subject<T>();
    const w = this.getWorker(fn);

    // Подписываемся на событие получения результата
    w.worker.onmessage = (m: any) =>
    {
      this.clear(w);
      result.next(m.data);
    };

    // Подписываемся на событие получение ошибки
    w.worker.onerror = (er) =>
    {
      this.clear(w);
      result.error(er);
    }

    w.worker.postMessage(data);

    return result;
  }

  /** Получение объекта процесса */
  private getWorker<T, K>(fn: (v: K) => T): IWorker
  {
    const frStr = fn.toString();
    let arrayWorkers = this.dWorkers.get(frStr) ?? [];
    let w = arrayWorkers?.find(w => !w.isWork);

    if (!w)
    {
      w = { isWork: true, worker: this.createWorker(frStr) }
      arrayWorkers.push(w);
      this.dWorkers.set(frStr, arrayWorkers);
    }
    else
      w.isWork = true;

    return w;
  }

  /** Создание фонового процесса */
  private createWorker(fn: string): Worker
  {
    var blob = new Blob([
      'self.onmessage = ',
      `(arguments)=>{const f = ${fn};self.postMessage(f(arguments.data));}`
    ], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);

    return new Worker(url);
  }

  /** Отчистка промежуточных данных */
  private clear(w: IWorker)
  {
    const worker = (w as IWorker).worker;
    worker.onmessage = null;
    worker.onerror = null;
    (w as IWorker).isWork = false;
  }

}
