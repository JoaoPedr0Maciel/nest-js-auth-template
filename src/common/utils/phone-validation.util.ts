/**
 * Validação para números de telefone de Angola
 * Formato: +244XXXXXXXXX (9 dígitos após o código do país)
 * Operadoras principais:
 * - Unitel: +244 9XX XXX XXX
 * - Africell: +244 9XX XXX XXX
 * - Movicel: +244 9XX XXX XXX
 */

export class PhoneValidationUtil {
  // Regex para validar telefones de Angola
  // Formato: +244 seguido de 9 dígitos
  private static readonly ANGOLA_PHONE_REGEX = /^\+244[9][0-9]{8}$/;

  // Regex mais flexível que aceita diferentes formatos de entrada
  private static readonly ANGOLA_PHONE_FLEXIBLE_REGEX =
    /^(\+244|244|0)?[9][0-9]{8}$/;

  /**
   * Valida se o telefone é um número válido de Angola
   */
  static isValidAngolaPhone(phone: string): boolean {
    if (!phone) return false;

    const normalizedPhone = this.normalizePhone(phone);
    return this.ANGOLA_PHONE_REGEX.test(normalizedPhone);
  }

  /**
   * Normaliza o telefone para o formato padrão +244XXXXXXXXX
   */
  static normalizePhone(phone: string): string {
    if (!phone) return '';

    // Remove espaços, traços e parênteses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Se começa com +244, mantém como está
    if (cleaned.startsWith('+244')) {
      return cleaned;
    }

    // Se começa com 244, adiciona o +
    if (cleaned.startsWith('244')) {
      return '+' + cleaned;
    }

    // Se começa com 0, remove o 0 e adiciona +244
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+244' + cleaned.substring(1);
    }

    // Se tem 9 dígitos e começa com 9, adiciona +244
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return '+244' + cleaned;
    }

    return cleaned;
  }

  /**
   * Formata o telefone para exibição (com espaços)
   */
  static formatPhoneForDisplay(phone: string): string {
    const normalized = this.normalizePhone(phone);

    if (this.isValidAngolaPhone(normalized)) {
      // Formato: +244 9XX XXX XXX
      return normalized.replace(
        /(\+244)([9])([0-9]{2})([0-9]{3})([0-9]{3})/,
        '$1 $2$3 $4 $5',
      );
    }

    return phone;
  }

  /**
   * Identifica a operadora pelo número (básico)
   */
  static getOperator(phone: string): string {
    const normalized = this.normalizePhone(phone);

    if (!this.isValidAngolaPhone(normalized)) {
      return 'Unknown';
    }

    // Extrai os primeiros 3 dígitos após +244
    const prefix = normalized.substring(4, 7);

    // Mapeamento básico (pode ser expandido conforme necessário)
    const operatorMap: { [key: string]: string } = {
      '923': 'Unitel',
      '924': 'Unitel',
      '925': 'Unitel',
      '926': 'Africell',
      '927': 'Africell',
      '928': 'Movicel',
      '929': 'Movicel',
    };

    return operatorMap[prefix] || 'Angola Mobile';
  }
}
