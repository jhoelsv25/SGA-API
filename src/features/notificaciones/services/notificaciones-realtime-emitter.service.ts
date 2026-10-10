import { Injectable } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { interval, merge, Observable, Subject } from "rxjs";
import { filter, map } from "rxjs/operators";
import type { NotificacionItem } from "../interfaces";

@Injectable()
export class NotificacionesRealtimeEmitter {
  private readonly events$ = new Subject<{ usuarioId: string; notificacion: NotificacionItem }>();

  emit(notificacion: NotificacionItem): void {
    this.events$.next({ usuarioId: notificacion.usuarioId, notificacion });
  }

  getStream(usuarioId: string): Observable<MessageEvent> {
    const notifications$: Observable<MessageEvent> = this.events$.asObservable().pipe(
      filter((e) => e.usuarioId === usuarioId),
      map((e) => ({
        data: e.notificacion,
        type: "notificacion",
      })),
    );

    const heartbeat$: Observable<MessageEvent> = interval(25000).pipe(
      map(() => ({
        data: { ping: true, timestamp: new Date().toISOString() },
        type: "ping",
      })),
    );

    return merge(notifications$, heartbeat$);
  }
}
