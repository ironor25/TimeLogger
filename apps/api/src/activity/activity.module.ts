import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { AgentActivityController } from './agent-activity.controller';

@Module({
  controllers: [ActivityController, AgentActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
