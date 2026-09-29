import { Module } from '@nestjs/common';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsController } from './work-sessions.controller';
import { AgentWorkSessionsController } from './agent-work-sessions.controller';

@Module({
  controllers: [WorkSessionsController, AgentWorkSessionsController],
  providers: [WorkSessionsService],
  exports: [WorkSessionsService],
})
export class WorkSessionsModule {}
