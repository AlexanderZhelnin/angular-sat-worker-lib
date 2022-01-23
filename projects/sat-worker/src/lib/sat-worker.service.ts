import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { BehaviorSubject, defer, from, Observable, Subject, switchMap } from 'rxjs';


export enum WorkTypeEnum
{
  /** Любые процессы выполняются параллельно */
  parallel = 1,
  /** Одинаковые процессы выполняются последовательно */
  serial = 2,
  /** Выполняется последний */
  serialLast = 3,
}

/** Общие настройки фоновых процессов */
export interface ISATWorker
{
  /** Возможность фоновых процессов */
  isAsync: boolean;
  /** Тип запуска фонового процесса по умолчанию */
  defaultWorkType?: WorkTypeEnum;
}

/** Фоновый процесс */
interface IWorker
{
  /** Флаг выполнения процесса */
  isWork?: boolean;
  /** Фоновый процесс */
  worker: Worker;
  /** Исходный код фонового процесса */
  frStr: string;
}

/** Опции запуска фонового процесса */
export interface IWorkOptions
{
  /** Тип запуска фонового процесса */
  workType: WorkTypeEnum;
}

/** Токен свойств */
export const SATWORKER_OPTIONS = new InjectionToken<Observable<ISATWorker>>('SATWORKER_OPTIONS');

@Injectable({ providedIn: 'root' })
export class SatWorkerService
{
  /** Свойства сервиса фоновых процессов */
  private options: Observable<ISATWorker>;
  /** Выполняемые фоновые процессы */
  private dWorkers = new Map<string, IWorker[]>();
  /** Флаг показывающий поддержку фоновых процессов */
  private canWorkers = true;
  /** Ожидающие выполнения фоновые процессы */
  private waitingWorkers = new Map<string, Subject<IWorker>[]>();

  /** Конструктор */
  constructor(@Optional() @Inject(SATWORKER_OPTIONS) options: Observable<ISATWorker>)
  {
    // Если опции не заданы, то устанавливаем значения по умолчанию
    this.options = options ?? new BehaviorSubject({ isAsync: true });

    // Поддержка фоновых процессов
    this.canWorkers = typeof Worker !== 'undefined';
  }

  /**
   * Запуск фонового процесса
   *
   * @template TResult Результирующий тип данных функции
   * @template K Входной тип данных функции
   * @param fn Функция фонового процесса
   * @param [value=undefined] Аргумент функции
   * @param [options=undefined] Опция запуска фонового процесса
   * @return {*} Ожидающий результат
   */
  public work<TResult, K>(fn: (v: K) => TResult, value: any = undefined, options: IWorkOptions | undefined = undefined): Observable<TResult>
  {
    return this.options.pipe(switchMap(o =>
      (o.isAsync && this.canWorkers)
        ? this.workAsync<TResult, K>(fn, value, { ...options, workType: options?.workType ?? o.defaultWorkType ?? WorkTypeEnum.parallel })
        : new BehaviorSubject(fn(value))
    ));
  }

  //
  /**
   * Запуска функции в фоне
   *
   * @template TResult Результирующий тип данных функции
   * @template K Входной тип данных функции
   * @param fn Функция фонового процесса
   * @param [value=undefined] аргумент функции
   * @param options опция запуска фонового процесса
   * @return {*} ожидающий результат
   */
  private workAsync<TResult, K>(fn: (v: K) => TResult, value: K | undefined = undefined, options: IWorkOptions): Observable<TResult>
  {
    return this.getWorker(fn, options)
      .pipe(
        switchMap(w =>
        {
          w.isWork = true;
          const result = new Subject<TResult>();
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

          w.worker.postMessage(value);
          return result;
        }));
  }

  /**
   *  Получение фонового процесса
   *
   * @template TResult Результирующий тип данных функции
   * @template K Входной тип данных функции
   * @param fn Функция фонового процесса
   * @param options Опция запуска фонового процесса
   * @return {*} Ожидающий фоновый процесс
   */
  private getWorker<TResult, K>(fn: (v: K) => TResult, options: IWorkOptions): Observable<IWorker>
  {
    const frStr = fn.toString();

    let arrayWorkers = this.dWorkers.get(frStr) ?? [];
    switch (options.workType)
    {
      case WorkTypeEnum.parallel:
        return this.getParallelWorker(frStr, arrayWorkers);
      case WorkTypeEnum.serial:
        return this.getSerialWorker(frStr, arrayWorkers, false);
      case WorkTypeEnum.serialLast:
        return this.getSerialWorker(frStr, arrayWorkers, true);
    }
  }

  /**
   * Получение параллельного фонового процесса
   *
   * @param frStr Исходный код функции
   * @param arrayWorkers Массив идентичных фоновых процессов
   * @return {*} Ожидающий фоновый процесс
   */
  private getParallelWorker(frStr: string, arrayWorkers: IWorker[]): Observable<IWorker>
  {
    // Находим не запущенный фоновый процесс
    let w = arrayWorkers?.find(w => !w.isWork);

    if (!w)
    {
      // Создаём новый фоновый процесс
      w = { worker: this.createWorker(frStr), frStr }
      // Запоминаем фоновый процесс в словаре по ключу (код выполняемой функции)
      arrayWorkers.push(w);
      this.dWorkers.set(frStr, arrayWorkers);
    }

    return new BehaviorSubject(w);
  }

  /**
   * Получение последовательного фонового процесса
   *
   * @param frStr Исходный код функции
   * @param arrayWorkers Массив идентичных фоновых процессов
   * @param isLast Флаг постановки в очередь только последнего
   * @return {*} Ожидающий фоновый процесс
   */
  private getSerialWorker(frStr: string, arrayWorkers: IWorker[], isLast: boolean): Observable<IWorker>
  {
    if (arrayWorkers.length > 0)
    {
      if (!arrayWorkers[0].isWork)
        return new BehaviorSubject(arrayWorkers[0]);

      var result = new Subject<IWorker>()
      //#region Сохраняем в очередь ожидающих процессов
      const wArrayWorkers = this.waitingWorkers.get(frStr) ?? [];
      if (isLast && wArrayWorkers.length > 0)
        // При типе выполнения "последний" мы в массиве заменяем не выполненный процесс новым ожиданием
        wArrayWorkers[0] = result;
      else
        // При последовательном выполнении или когда ещё нет ожидающих => просто добавляем в очередь
        wArrayWorkers.push(result);

      this.waitingWorkers.set(frStr, wArrayWorkers);
      //#endregion

      return result;
    }

    // Создаём новый фоновый процесс
    const w: IWorker = { isWork: true, worker: this.createWorker(frStr), frStr }
    // Запоминаем фоновый процесс в словаре по ключу (код выполняемой функции)
    arrayWorkers.push(w);
    this.dWorkers.set(frStr, arrayWorkers);

    return new BehaviorSubject(w);
  }

  /** Создание фонового процесса */
  private createWorker(fn: string): Worker
  {
    // Создаём фоновый процесс из исходного кода
    var blob = new Blob([
      'self.onmessage=',
      `(arg)=>{const f = ${fn};self.postMessage(f(arg.data));};`
    ], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);

    return new Worker(url);
  }

  /** Отчистка промежуточных данных */
  private clear(w: IWorker)
  {
    const worker = w.worker;
    worker.onmessage = null;
    worker.onerror = null;
    w.isWork = false;

    // Отдаём фоновый процесс ожидающей очереди
    this.waitingWorkers.get(w.frStr)?.shift()?.next(w);
  }

}
