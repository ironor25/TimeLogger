import { Module } from '@nestjs/common';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { AgentScreenshotsController } from './agent-screenshots.controller';

@Module({
  controllers: [ScreenshotsController, AgentScreenshotsController],
  providers: [ScreenshotsService],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}
