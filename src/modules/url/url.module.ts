import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { UidModule } from '../../services/uid/uid.module'

@Module({
  controllers: [UrlController],
  providers: [UrlService],
  imports: [UidModule],
})
export class UrlModule { }
