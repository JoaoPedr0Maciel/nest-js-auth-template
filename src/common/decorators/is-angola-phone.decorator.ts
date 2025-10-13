import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { PhoneValidationUtil } from '../utils/phone-validation.util';

export function IsAngolaPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAngolaPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === 'string' &&
            PhoneValidationUtil.isValidAngolaPhone(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um número de telefone válido de Angola (formato: +244XXXXXXXXX)`;
        },
      },
    });
  };
}
