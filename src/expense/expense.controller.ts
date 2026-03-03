import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../common/decorator/auth.decorator';
import { JwtAuthGuard } from '../user/guards/jwt-auth/jwt-auth.guard';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensePaginationQueryDto } from './dto/expense-pagination-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PlanLimitGuard } from '../plan-limit/guards/plan-limit.guard';
import { PlanLimit } from '../plan-limit/decorators/plan-limit.decorator';
import { PlanLimitAction } from '../plan-limit/enums/plan-limit-action.enum';

@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlanLimitGuard)
  @PlanLimit(PlanLimitAction.CREATE_EXPENSE)
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const expense = await this.expenseService.createExpense(dto, userId);
    return {
      message: 'Expense created successfully',
      data: expense,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Auth()
  async updateExpense(
    @Param('id') expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const expense = await this.expenseService.updateExpense(expenseId, dto, userId);
    return {
      message: 'Expense updated successfully',
      data: expense,
    };
  }

  @Get('group/:groupId')
  @ApiBearerAuth()
  @Auth()
  async getExpensesByGroupId(
    @Param('groupId') groupId: string,
    @Query() pagination: ExpensePaginationQueryDto,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const result = await this.expenseService.getExpensesByGroupId(
      groupId,
      userId,
      page,
      limit,
    );
    return {
      message: 'Expenses retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Auth()
  async deleteExpense(
    @Param('id') expenseId: string,
    @Req() req: { user?: { id: string } },
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    await this.expenseService.deleteExpense(expenseId, userId);
    return {
      message: 'Expense deleted successfully',
    };
  }
}
