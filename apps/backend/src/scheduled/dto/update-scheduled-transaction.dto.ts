import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateScheduledTransactionDto } from './create-scheduled-transaction.dto';

export class UpdateScheduledTransactionDto extends PartialType(
  OmitType(CreateScheduledTransactionDto, [] as const),
) {}
