import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Import the model
const employmentModule = await import('../../models/employment.js');
const Employment = employmentModule.default;

describe('Employment Model', () => {
  beforeAll(() => {
    // Ensure we're not connected to a real database
    if (mongoose.connection.readyState !== 0) {
      mongoose.disconnect();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema validation', () => {
    test('should create a valid employment record with all required fields', () => {
      const validData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
        currentPosition: false,
        description: 'Developed web applications',
      };

      const employment = new Employment(validData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
      expect(employment.userId).toBe(validData.userId);
      expect(employment.jobTitle).toBe(validData.jobTitle);
      expect(employment.company).toBe(validData.company);
      expect(employment.location).toBe(validData.location);
      expect(employment.startDate).toEqual(validData.startDate);
      expect(employment.endDate).toEqual(validData.endDate);
      expect(employment.currentPosition).toBe(false);
      expect(employment.description).toBe(validData.description);
    });

    test('should create valid employment with only required fields', () => {
      const minimalData = {
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(minimalData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
      expect(employment.location).toBe('');
      expect(employment.currentPosition).toBe(false);
      expect(employment.description).toBe('');
      expect(employment.endDate).toBeUndefined();
    });

    test('should fail validation if userId is missing', () => {
      const invalidData = {
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.userId.kind).toBe('required');
    });

    test('should fail validation if jobTitle is missing', () => {
      const invalidData = {
        userId: 'user123',
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.jobTitle).toBeDefined();
      expect(validationError.errors.jobTitle.kind).toBe('required');
    });

    test('should fail validation if company is missing', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.company).toBeDefined();
      expect(validationError.errors.company.kind).toBe('required');
    });

    test('should fail validation if startDate is missing', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.startDate).toBeDefined();
      expect(validationError.errors.startDate.kind).toBe('required');
    });

    test('should fail validation if jobTitle exceeds 150 characters', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'A'.repeat(151),
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.jobTitle).toBeDefined();
      expect(validationError.errors.jobTitle.kind).toBe('maxlength');
    });

    test('should pass validation if jobTitle is exactly 150 characters', () => {
      const validData = {
        userId: 'user123',
        jobTitle: 'A'.repeat(150),
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(validData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
    });

    test('should fail validation if company exceeds 150 characters', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'A'.repeat(151),
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.company).toBeDefined();
      expect(validationError.errors.company.kind).toBe('maxlength');
    });

    test('should pass validation if company is exactly 150 characters', () => {
      const validData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'A'.repeat(150),
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(validData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
    });

    test('should fail validation if location exceeds 150 characters', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        location: 'A'.repeat(151),
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.location).toBeDefined();
      expect(validationError.errors.location.kind).toBe('maxlength');
    });

    test('should pass validation if location is exactly 150 characters', () => {
      const validData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        location: 'A'.repeat(150),
        startDate: new Date('2023-01-01'),
      };

      const employment = new Employment(validData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
    });

    test('should fail validation if description exceeds 1000 characters', () => {
      const invalidData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
        description: 'A'.repeat(1001),
      };

      const employment = new Employment(invalidData);
      const validationError = employment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.description).toBeDefined();
      expect(validationError.errors.description.kind).toBe('maxlength');
    });

    test('should pass validation if description is exactly 1000 characters', () => {
      const validData = {
        userId: 'user123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        startDate: new Date('2023-01-01'),
        description: 'A'.repeat(1000),
      };

      const employment = new Employment(validData);
      const validationError = employment.validateSync();

      expect(validationError).toBeUndefined();
    });
  });

  describe('Default values', () => {
    test('should set default value for location as empty string', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment.location).toBe('');
    });

    test('should set default value for currentPosition as false', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment.currentPosition).toBe(false);
    });

    test('should set default value for description as empty string', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment.description).toBe('');
    });

    test('should allow overriding default values', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        location: 'New York, NY',
        currentPosition: true,
        description: 'Custom description',
      });

      expect(employment.location).toBe('New York, NY');
      expect(employment.currentPosition).toBe(true);
      expect(employment.description).toBe('Custom description');
    });
  });

  describe('Optional fields', () => {
    test('should allow endDate to be undefined', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment.endDate).toBeUndefined();
      const validationError = employment.validateSync();
      expect(validationError).toBeUndefined();
    });

    test('should allow endDate when currentPosition is true', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        currentPosition: true,
      });

      expect(employment.endDate).toBeUndefined();
      const validationError = employment.validateSync();
      expect(validationError).toBeUndefined();
    });

    test('should allow endDate when currentPosition is false', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
        currentPosition: false,
      });

      expect(employment.endDate).toEqual(new Date('2024-01-01'));
      const validationError = employment.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe('Timestamps', () => {
    test('should have timestamps enabled', () => {
      const schema = Employment.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    test('should create employment with timestamp fields', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      const schema = Employment.schema;
      // Timestamps are added on save, but the schema should have the paths
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    test('should have userId indexed', () => {
      const schema = Employment.schema;
      const userIdPath = schema.path('userId');
      
      expect(userIdPath.options.index).toBe(true);
    });

    test('should have compound index for userId, startDate, and createdAt', () => {
      const schema = Employment.schema;
      const indexes = schema.indexes();
      
      const compoundIndex = indexes.find(
        (idx) =>
          idx[0].userId === 1 &&
          idx[0].startDate === -1 &&
          idx[0].createdAt === -1
      );

      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Model usage', () => {
    test('should create model instance with new keyword', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment).toBeInstanceOf(Employment);
      expect(employment).toBeInstanceOf(mongoose.Model);
    });

    test('should return the same model when imported multiple times', () => {
      // This tests the mongoose.models.Employment || pattern
      expect(Employment).toBe(mongoose.models.Employment);
    });
  });

  describe('Data types', () => {
    test('should accept valid Date objects for startDate', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
      });

      expect(employment.startDate).toBeInstanceOf(Date);
      expect(employment.validateSync()).toBeUndefined();
    });

    test('should accept valid Date objects for endDate', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-01-01'),
      });

      expect(employment.endDate).toBeInstanceOf(Date);
      expect(employment.validateSync()).toBeUndefined();
    });

    test('should accept boolean values for currentPosition', () => {
      const employment1 = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        currentPosition: true,
      });

      const employment2 = new Employment({
        userId: 'user123',
        jobTitle: 'Developer',
        company: 'StartUp Inc',
        startDate: new Date('2023-01-01'),
        currentPosition: false,
      });

      expect(employment1.currentPosition).toBe(true);
      expect(employment2.currentPosition).toBe(false);
      expect(employment1.validateSync()).toBeUndefined();
      expect(employment2.validateSync()).toBeUndefined();
    });

    test('should accept string values for all string fields', () => {
      const employment = new Employment({
        userId: 'user123',
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Company LLC',
        location: 'Remote',
        startDate: new Date('2023-01-01'),
        description: 'Led development of microservices architecture',
      });

      expect(typeof employment.userId).toBe('string');
      expect(typeof employment.jobTitle).toBe('string');
      expect(typeof employment.company).toBe('string');
      expect(typeof employment.location).toBe('string');
      expect(typeof employment.description).toBe('string');
    });
  });
});