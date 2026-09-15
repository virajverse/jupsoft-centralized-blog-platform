import { Module, Global } from '@nestjs/common';
import { CloudWatchLoggerService } from './cloudwatch-logger.service';

@Global()
@Module({
  providers: [CloudWatchLoggerService],
  exports: [CloudWatchLoggerService],
})
export class LoggerModule {}
