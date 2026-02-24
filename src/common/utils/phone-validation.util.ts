export function isValidBrazilPhone(phone: string): boolean {
  return !phone.match(/^\+55\d{11}$/) ? false : true;
}

