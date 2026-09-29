import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController, AgentProjectsController } from './projects.controller';

@Module({
  controllers: [ProjectsController, AgentProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
