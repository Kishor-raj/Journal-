export function required(value, fieldName = 'This field') {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function minLength(value, min, fieldName = 'This field') {
  if (!value) return null;
  if (typeof value === 'string' && value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
}

export function maxLength(value, max, fieldName = 'This field') {
  if (!value) return null;
  if (typeof value === 'string' && value.length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
}

export function email(value) {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function compose(...validators) {
  return (value, fieldName) => {
    for (const validator of validators) {
      const error = validator(value, fieldName);
      if (error) return error;
    }
    return null;
  };
}
