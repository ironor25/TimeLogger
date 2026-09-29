import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController, AgentTasksController } from './tasks.controller';

@Module({
  controllers: [TasksController, AgentTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
