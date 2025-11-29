import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';

/**
 * Request DTO for updating an existing budget
 *
 * All fields are optional. Only provided fields will be updated.
 * The budget must belong to the authenticated user's family.
 *
 * @example
 * {
 *   "amount": 600.00,
 *   "notes": "Increased budget for holidays"
 * }
 */
export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
