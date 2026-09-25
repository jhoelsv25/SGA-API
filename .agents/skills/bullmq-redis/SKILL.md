---
name: bullmq-redis
description: Guía y patrones para implementar colas asíncronas, procesadores de trabajos en segundo plano y Redis en NestJS usando @nestjs/bullmq y bullmq.
---

# BullMQ y Redis en NestJS

Esta guía proporciona patrones y mejores prácticas para procesar tareas pesadas en segundo plano (reportes masivos, correos electrónicos, sincronizaciones) de manera desacoplada y escalable.

## 1. Configuración del Módulo BullMQ

Registra BullMQ en el módulo raíz (`AppModule`) o en un módulo compartido utilizando la variable `REDIS_URL`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## 2. Registro de una Cola en un Módulo de Feature

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsProcessor } from './processors/reports.processor';
import { ReportsService } from './services/reports.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reports',
    }),
  ],
  providers: [ReportsService, ReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
```

## 3. Productor (Añadir Trabajos a la Cola)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ReportsService {
  constructor(
    @InjectQueue('reports') private readonly reportsQueue: Queue,
  ) {}

  async queueReportGeneration(userId: string, reportType: string) {
    const job = await this.reportsQueue.add(
      'generate-report',
      { userId, reportType },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );

    return { jobId: job.id, status: 'QUEUED' };
  }
}
```

## 4. Consumidor / Procesador de Trabajos

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('reports')
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  async process(job: Job<{ userId: string; reportType: string }>): Promise<any> {
    this.logger.log(`Procesando trabajo ${job.id} de tipo ${job.name} para usuario ${job.data.userId}`);
    
    switch (job.name) {
      case 'generate-report':
        return await this.handleReportGeneration(job.data);
      default:
        throw new Error(`Trabajo desconocido: ${job.name}`);
    }
  }

  private async handleReportGeneration(data: { userId: string; reportType: string }) {
    // Lógica pesada de generación
    return { success: true };
  }
}
```
