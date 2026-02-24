import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidBrazilPhone } from '../utils/phone-validation.util';

export function IsBrazilPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBrazilPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === 'string' &&
            isValidBrazilPhone(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um número de telefone válido de Brasil (formato: +55XXXXXXXXX)`;
        },
      },
    });
  };
}
