import { Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';

export interface TableContext {
  tableName: string;
  columnName: string;
  columnType: string;
  index: number;
}

@Injectable({
  providedIn: 'root'
})
export class SmartDataGeneratorService {

  constructor() {
    // Faker.js v10 doesn't need locale setting
  }

  /**
   * Generates intelligent data based on table and field context
   */
  generateSmartData(context: TableContext): any {
    const { tableName, columnName, columnType, index } = context;
    
    // Combine table and field name for better context
    const fullContext = `${tableName}_${columnName}`.toLowerCase();
    
    switch (columnType.toLowerCase()) {
      case 'varchar':
      case 'text':
      case 'string':
        return this.generateSmartString(fullContext, columnName, index);
      case 'int':
      case 'integer':
      case 'number':
        return this.generateSmartNumber(fullContext, columnName, index);
      case 'boolean':
      case 'bool':
        return this.generateSmartBoolean(fullContext, columnName);
      case 'date':
        return this.generateSmartDate(fullContext, columnName, index);
      case 'datetime':
      case 'timestamp':
        return this.generateSmartDateTime(fullContext, columnName, index);
      case 'decimal':
      case 'float':
        return this.generateSmartDecimal(fullContext, columnName, index);
      default:
        return this.generateFallback(fullContext, columnType, index);
    }
  }

  private generateSmartString(context: string, columnName: string, index: number): string {
    // Use full context for better generation
    const lowerContext = context.toLowerCase();
    const lowerColumn = columnName.toLowerCase();

    // Users table
    if (lowerContext.includes('user') || lowerContext.includes('customer') || lowerContext.includes('person')) {
      return this.generateUserData(lowerColumn, index);
    }
    
    // Products table
    if (lowerContext.includes('product') || lowerContext.includes('item') || lowerContext.includes('goods')) {
      return this.generateProductData(lowerColumn, index);
    }
    
    // Orders table
    if (lowerContext.includes('order') || lowerContext.includes('purchase') || lowerContext.includes('transaction')) {
      return this.generateOrderData(lowerColumn, index);
    }
    
    // Categories table
    if (lowerContext.includes('category') || lowerContext.includes('type') || lowerContext.includes('class')) {
      return this.generateCategoryData(lowerColumn, index);
    }
    
    // Roles/permissions table
    if (lowerContext.includes('role') || lowerContext.includes('permission') || lowerContext.includes('access')) {
      return this.generateRoleData(lowerColumn, index);
    }
    
    // Specific fields by name
    return this.generateByColumnName(lowerColumn, index);
  }

  private generateUserData(columnName: string, index: number): string {
    if (columnName.includes('email')) {
      return faker.internet.email();
    } else if (columnName.includes('first') || columnName.includes('given')) {
      return faker.person.firstName();
    } else if (columnName.includes('last') || columnName.includes('surname') || columnName.includes('family')) {
      return faker.person.lastName();
    } else if (columnName.includes('name') && !columnName.includes('first') && !columnName.includes('last')) {
      return faker.person.fullName();
    } else if (columnName.includes('username') || columnName.includes('login')) {
      return faker.internet.username();
    } else if (columnName.includes('phone') || columnName.includes('mobile')) {
      return faker.phone.number();
    } else if (columnName.includes('address') || columnName.includes('street')) {
      return faker.location.streetAddress();
    } else if (columnName.includes('city')) {
      return faker.location.city();
    } else if (columnName.includes('country')) {
      return faker.location.country();
    } else if (columnName.includes('zip') || columnName.includes('postal')) {
      return faker.location.zipCode();
    } else if (columnName.includes('company') || columnName.includes('organization')) {
      return faker.company.name();
    } else if (columnName.includes('job') || columnName.includes('title') || columnName.includes('position')) {
      return faker.person.jobTitle();
    } else if (columnName.includes('bio') || columnName.includes('description')) {
      return faker.lorem.sentence();
    } else if (columnName.includes('website') || columnName.includes('url')) {
      return faker.internet.url();
    } else if (columnName.includes('avatar') || columnName.includes('image')) {
      return faker.image.avatar();
    } else {
      return faker.lorem.word();
    }
  }

  private generateProductData(columnName: string, index: number): string {
    if (columnName.includes('name') || columnName.includes('title')) {
      return faker.commerce.productName();
    } else if (columnName.includes('description') || columnName.includes('desc')) {
      return faker.commerce.productDescription();
    } else if (columnName.includes('category') || columnName.includes('type')) {
      return faker.commerce.department();
    } else if (columnName.includes('brand') || columnName.includes('manufacturer')) {
      return faker.company.name();
    } else if (columnName.includes('color')) {
      return faker.color.human();
    } else if (columnName.includes('material')) {
      return faker.commerce.productMaterial();
    } else if (columnName.includes('sku') || columnName.includes('code')) {
      return faker.string.alphanumeric(8).toUpperCase();
    } else if (columnName.includes('image') || columnName.includes('photo')) {
      return faker.image.url();
    } else {
      return faker.lorem.word();
    }
  }

  private generateOrderData(columnName: string, index: number): string {
    if (columnName.includes('status') || columnName.includes('state')) {
      const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      return faker.helpers.arrayElement(statuses);
    } else if (columnName.includes('payment') || columnName.includes('method')) {
      const methods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'];
      return faker.helpers.arrayElement(methods);
    } else if (columnName.includes('shipping') || columnName.includes('delivery')) {
      const methods = ['standard', 'express', 'overnight', 'pickup'];
      return faker.helpers.arrayElement(methods);
    } else if (columnName.includes('tracking') || columnName.includes('number')) {
      return faker.string.alphanumeric(12).toUpperCase();
    } else if (columnName.includes('notes') || columnName.includes('comment')) {
      return faker.lorem.sentence();
    } else {
      return faker.lorem.word();
    }
  }

  private generateCategoryData(columnName: string, index: number): string {
    if (columnName.includes('name') || columnName.includes('title')) {
      return faker.commerce.department();
    } else if (columnName.includes('description') || columnName.includes('desc')) {
      return faker.lorem.sentence();
    } else if (columnName.includes('slug') || columnName.includes('url')) {
      return faker.helpers.slugify(faker.commerce.department());
    } else if (columnName.includes('icon') || columnName.includes('image')) {
      return faker.image.url();
    } else {
      return faker.lorem.word();
    }
  }

  private generateRoleData(columnName: string, index: number): string {
    if (columnName.includes('name') || columnName.includes('title')) {
      const roles = ['admin', 'user', 'moderator', 'editor', 'viewer', 'manager', 'supervisor'];
      return faker.helpers.arrayElement(roles);
    } else if (columnName.includes('description') || columnName.includes('desc')) {
      return faker.lorem.sentence();
    } else if (columnName.includes('permission') || columnName.includes('access')) {
      const permissions = ['read', 'write', 'delete', 'admin', 'moderate'];
      return faker.helpers.arrayElement(permissions);
    } else {
      return faker.lorem.word();
    }
  }

  private generateByColumnName(columnName: string, index: number): string {
    if (columnName.includes('email')) {
      return faker.internet.email();
    } else if (columnName.includes('name')) {
      return faker.person.fullName();
    } else if (columnName.includes('title')) {
      return faker.lorem.sentence(3);
    } else if (columnName.includes('description') || columnName.includes('desc')) {
      return faker.lorem.sentence();
    } else if (columnName.includes('phone') || columnName.includes('mobile')) {
      return faker.phone.number();
    } else if (columnName.includes('address')) {
      return faker.location.streetAddress();
    } else if (columnName.includes('city')) {
      return faker.location.city();
    } else if (columnName.includes('country')) {
      return faker.location.country();
    } else if (columnName.includes('url') || columnName.includes('website')) {
      return faker.internet.url();
    } else if (columnName.includes('status')) {
      return faker.helpers.arrayElement(['active', 'inactive', 'pending', 'approved']);
    } else if (columnName.includes('code') || columnName.includes('sku')) {
      return faker.string.alphanumeric(6).toUpperCase();
    } else {
      return faker.lorem.word();
    }
  }

  private generateSmartNumber(context: string, columnName: string, index: number): number {
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('age')) {
      return faker.number.int({ min: 18, max: 65 });
    } else if (lowerColumn.includes('price') || lowerColumn.includes('cost') || lowerColumn.includes('amount')) {
      return faker.number.int({ min: 10, max: 1000 });
    } else if (lowerColumn.includes('quantity') || lowerColumn.includes('count') || lowerColumn.includes('stock')) {
      return faker.number.int({ min: 0, max: 100 });
    } else if (lowerColumn.includes('year')) {
      return faker.number.int({ min: 2020, max: 2024 });
    } else if (lowerColumn.includes('month')) {
      return faker.number.int({ min: 1, max: 12 });
    } else if (lowerColumn.includes('day')) {
      return faker.number.int({ min: 1, max: 28 });
    } else if (lowerColumn.includes('hour')) {
      return faker.number.int({ min: 0, max: 23 });
    } else if (lowerColumn.includes('minute')) {
      return faker.number.int({ min: 0, max: 59 });
    } else if (lowerColumn.includes('score') || lowerColumn.includes('rating')) {
      return faker.number.int({ min: 1, max: 5 });
    } else if (lowerColumn.includes('priority') || lowerColumn.includes('level')) {
      return faker.number.int({ min: 1, max: 10 });
    } else {
      return index + 1;
    }
  }

  private generateSmartBoolean(context: string, columnName: string): boolean {
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('active') || lowerColumn.includes('enabled') || lowerColumn.includes('visible')) {
      return faker.datatype.boolean(0.8); // 80% true
    } else if (lowerColumn.includes('deleted') || lowerColumn.includes('archived') || lowerColumn.includes('disabled')) {
      return faker.datatype.boolean(0.2); // 20% true
    } else if (lowerColumn.includes('verified') || lowerColumn.includes('confirmed') || lowerColumn.includes('approved')) {
      return faker.datatype.boolean(0.7); // 70% true
    } else {
      return faker.datatype.boolean();
    }
  }

  private generateSmartDate(context: string, columnName: string, index: number): string {
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('birth') || lowerColumn.includes('born')) {
      return faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0];
    } else if (lowerColumn.includes('created') || lowerColumn.includes('added')) {
      return faker.date.recent({ days: 365 }).toISOString().split('T')[0];
    } else if (lowerColumn.includes('updated') || lowerColumn.includes('modified')) {
      return faker.date.recent({ days: 30 }).toISOString().split('T')[0];
    } else {
      return faker.date.past().toISOString().split('T')[0];
    }
  }

  private generateSmartDateTime(context: string, columnName: string, index: number): string {
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('created') || lowerColumn.includes('added')) {
      return faker.date.recent({ days: 365 }).toISOString();
    } else if (lowerColumn.includes('updated') || lowerColumn.includes('modified')) {
      return faker.date.recent({ days: 30 }).toISOString();
    } else {
      return faker.date.past().toISOString();
    }
  }

  private generateSmartDecimal(context: string, columnName: string, index: number): number {
    const lowerColumn = columnName.toLowerCase();
    
    if (lowerColumn.includes('price') || lowerColumn.includes('cost') || lowerColumn.includes('amount')) {
      return parseFloat(faker.commerce.price());
    } else if (lowerColumn.includes('rate') || lowerColumn.includes('percentage')) {
      return parseFloat(faker.number.float({ min: 0, max: 100, fractionDigits: 2 }).toFixed(2));
    } else if (lowerColumn.includes('score') || lowerColumn.includes('rating')) {
      return parseFloat(faker.number.float({ min: 1, max: 5, fractionDigits: 1 }).toFixed(1));
    } else if (lowerColumn.includes('weight') || lowerColumn.includes('height')) {
      return parseFloat(faker.number.float({ min: 1, max: 100, fractionDigits: 2 }).toFixed(2));
    } else {
      return parseFloat(faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }).toFixed(2));
    }
  }

  private generateFallback(context: string, type: string, index: number): any {
    if (type.includes('string') || type.includes('text') || type.includes('char')) {
      return faker.lorem.word();
    } else if (type.includes('int') || type.includes('number')) {
      return index + 1;
    } else if (type.includes('bool')) {
      return faker.datatype.boolean();
    } else if (type.includes('date')) {
      return faker.date.past().toISOString().split('T')[0];
    } else {
      return faker.lorem.word();
    }
  }
}