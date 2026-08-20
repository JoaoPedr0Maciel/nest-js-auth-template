import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../shared/decorators/public.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/user.interface';
import { ConfirmTwoFactorSetupDto } from './dto/confirm-two-factor-setup.dto';
import { TwoFactorConfirmIdentityDto } from './dto/two-factor-confirm-identity.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { VerifyTwoFactorRecoveryDto } from './dto/verify-two-factor-recovery.dto';
import {
  ApiConfirmTwoFactorSetup,
  ApiDisableTwoFactor,
  ApiRegenerateTwoFactorRecoveryCodes,
  ApiSetupTwoFactor,
  ApiVerifyTwoFactor,
  ApiVerifyTwoFactorRecovery,
} from './docs/two-factor.swagger';

@ApiTags('two-factor')
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @UseGuards(JwtAuthGuard)
  @Post('setup')
  @ApiSetupTwoFactor()
  setup(@CurrentUser() user: RequestUser) {
    return this.twoFactorService.setup(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('setup/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiConfirmTwoFactorSetup()
  confirmSetup(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmTwoFactorSetupDto,
  ) {
    return this.twoFactorService.confirmSetup(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDisableTwoFactor()
  async disable(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorConfirmIdentityDto,
  ) {
    await this.twoFactorService.disable(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('recovery-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiRegenerateTwoFactorRecoveryCodes()
  regenerateRecoveryCodes(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorConfirmIdentityDto,
  ) {
    return this.twoFactorService.regenerateRecoveryCodes(user.id, dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyTwoFactor()
  verify(@Body() dto: VerifyTwoFactorDto) {
    return this.twoFactorService.verifyChallenge(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify/recovery')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyTwoFactorRecovery()
  verifyRecovery(@Body() dto: VerifyTwoFactorRecoveryDto) {
    return this.twoFactorService.verifyRecoveryChallenge(dto);
  }
}
