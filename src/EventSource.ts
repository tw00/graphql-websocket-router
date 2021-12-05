/*
Implements Observer pattern
*/

export type Callback<T> = (input: T) => void;

// EventManager, Subject
export default class EventSource<T> {
  private observers: Record<string, Callback<T>>;

  constructor() {
    this.observers = {};
  }

  public addObserver(clientId: string, cb: Callback<T>): void {
    if (clientId in this.observers) {
      console.warn(`Client ${clientId} already has an active observer.`);
    }
    this.observers[clientId] = cb;
  }

  public removeObserver(clientId: string) {
    delete this.observers[clientId];
  }

  public hasObservers() {
    return Object.keys(this.observers).length > 0;
  }

  public notifyObservers(input: T): void {
    Object.values(this.observers).forEach((cb) => cb(input));
  }

  public createNotifier() {
    return this.notifyObservers.bind(this);
  }
}
