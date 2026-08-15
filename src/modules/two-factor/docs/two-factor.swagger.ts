import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfirmTwoFactorSetupDto } from '../dto/confirm-two-factor-setup.dto';
import { TwoFactorConfirmIdentityDto } from '../dto/two-factor-confirm-identity.dto';
import { VerifyTwoFactorDto } from '../dto/verify-two-factor.dto';
import { VerifyTwoFactorRecoveryDto } from '../dto/verify-two-factor-recovery.dto';
import { TwoFactorSetupResponseDto } from '../dto/two-factor-setup-response.dto';
import { TwoFactorRecoveryCodesResponseDto } from '../dto/two-factor-recovery-codes-response.dto';
import { LoginResponseDto } from '../../auth/dto/login-response.dto';

const unauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Token JWT inválido',
});
const invalidCodeResponse = ApiResponse({
  status: 400,
  description: 'Código inválido, senha inválida, ou 2FA em estado incompatível',
});

export function ApiSetupTwoFactor() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Iniciar a configuração do 2FA (gera segredo pendente + QR code)',
    }),
    ApiBearerAuth('JWT-auth'),
    ApiResponse({
      status: 201,
      description: 'Segredo pendente gerado com sucesso',
      type: TwoFactorSetupResponseDto,
    }),
    ApiResponse({ status: 409, description: '2FA já está ativado' }),
    unauthorizedResponse,
  );
}

export function ApiConfirmTwoFactorSetup() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Confirmar a configuração do 2FA com um código válido e ativá-lo',
    }),
    ApiBearerAuth('JWT-auth'),
    ApiBody({ type: ConfirmTwoFactorSetupDto }),
    ApiResponse({
      status: 200,
      description:
        '2FA ativado com sucesso. Retorna os códigos de recuperação — não serão mostrados novamente',
      type: TwoFactorRecoveryCodesResponseDto,
    }),
    ApiResponse({ status: 409, description: '2FA já está ativado' }),
    invalidCodeResponse,
    unauthorizedResponse,
  );
}

export function ApiDisableTwoFactor() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Desativar o 2FA (exige senha + código válido para confirmar identidade)',
    }),
    ApiBearerAuth('JWT-auth'),
    ApiBody({ type: TwoFactorConfirmIdentityDto }),
    ApiResponse({ status: 204, description: '2FA desativado com sucesso' }),
    invalidCodeResponse,
    ApiResponse({ status: 400, description: '2FA não está ativado' }),
    unauthorizedResponse,
  );
}

export function ApiRegenerateTwoFactorRecoveryCodes() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Gerar um novo conjunto de códigos de recuperação, invalidando os anteriores',
    }),
    ApiBearerAuth('JWT-auth'),
    ApiBody({ type: TwoFactorConfirmIdentityDto }),
    ApiResponse({
      status: 200,
      description: 'Novos códigos de recuperação gerados com sucesso',
      type: TwoFactorRecoveryCodesResponseDto,
    }),
    invalidCodeResponse,
    ApiResponse({ status: 400, description: '2FA não está ativado' }),
    unauthorizedResponse,
  );
}

export function ApiVerifyTwoFactor() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Completar o login informando o código do autenticador (segunda etapa após POST /auth/login)',
    }),
    ApiBody({ type: VerifyTwoFactorDto }),
    ApiResponse({
      status: 200,
      description: 'Login concluído com sucesso',
      type: LoginResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Código inválido',
    }),
    ApiResponse({
      status: 401,
      description:
        'Desafio expirado, inválido, ou excedeu o limite de tentativas',
    }),
  );
}

export function ApiVerifyTwoFactorRecovery() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Completar o login usando um código de recuperação (quando o autenticador foi perdido)',
    }),
    ApiBody({ type: VerifyTwoFactorRecoveryDto }),
    ApiResponse({
      status: 200,
      description: 'Login concluído com sucesso. O 2FA permanece ativado',
      type: LoginResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Código de recuperação inválido ou já utilizado',
    }),
    ApiResponse({
      status: 401,
      description:
        'Desafio expirado, inválido, ou excedeu o limite de tentativas',
    }),
  );
}
