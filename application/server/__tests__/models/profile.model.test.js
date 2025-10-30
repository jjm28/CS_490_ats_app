import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Import the model
const profileModule = await import('../../models/profile.js');
const Profile = profileModule.default;

describe('Profile Model', () => {
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
    test('should create a valid profile with all fields', () => {
      const validData = {
        userId: 'user123',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        location: {
          city: 'San Francisco',
          state: 'CA',
        },
        headline: 'Software Engineer',
        bio: 'Experienced developer',
        industry: 'Technology',
        experienceLevel: 'Senior',
        profileType: 'professional',
        photoUrl: 'https://example.com/photo.jpg',
      };

      const profile = new Profile(validData);
      const validationError = profile.validateSync();

      expect(validationError).toBeUndefined();
      expect(profile.userId).toBe(validData.userId);
      expect(profile.fullName).toBe(validData.fullName);
      expect(profile.email).toBe(validData.email);
      expect(profile.phone).toBe(validData.phone);
      expect(profile.location.city).toBe(validData.location.city);
      expect(profile.location.state).toBe(validData.location.state);
      expect(profile.headline).toBe(validData.headline);
      expect(profile.bio).toBe(validData.bio);
      expect(profile.industry).toBe(validData.industry);
      expect(profile.experienceLevel).toBe(validData.experienceLevel);
      expect(profile.profileType).toBe(validData.profileType);
      expect(profile.photoUrl).toBe(validData.photoUrl);
    });

    test('should create profile with minimal fields', () => {
      const minimalData = {
        userId: 'user123',
      };

      const profile = new Profile(minimalData);
      const validationError = profile.validateSync();

      expect(validationError).toBeUndefined();
      expect(profile.userId).toBe('user123');
    });

    test('should require userId field', () => {
      const data = {
        fullName: 'John Doe',
        email: 'john@example.com',
      };

      const profile = new Profile(data);
      const validationError = profile.validateSync();

      // userId is required, so this should fail validation
      expect(validationError).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.userId.kind).toBe('required');
    });

    test('should require userId when all other fields are undefined', () => {
      const profile = new Profile({});
      const validationError = profile.validateSync();

      // userId is required
      expect(validationError).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.userId.kind).toBe('required');
    });

    test('should allow all optional fields to be undefined when userId is provided', () => {
      const profile = new Profile({ userId: 'user123' });
      const validationError = profile.validateSync();

      expect(validationError).toBeUndefined();
      expect(profile.fullName).toBeUndefined();
      expect(profile.email).toBeUndefined();
      expect(profile.phone).toBeUndefined();
      expect(profile.headline).toBeUndefined();
      expect(profile.bio).toBeUndefined();
      expect(profile.industry).toBeUndefined();
      expect(profile.experienceLevel).toBeUndefined();
    });
  });

  describe('Default values', () => {
    test('should set default value for profileType as "default"', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
      });

      expect(profile.profileType).toBe('default');
    });

    test('should set default value for photoUrl as empty string', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
      });

      expect(profile.photoUrl).toBe('');
    });

    test('should allow overriding default profileType', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
        profileType: 'custom',
      });

      expect(profile.profileType).toBe('custom');
    });

    test('should allow overriding default photoUrl', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
        photoUrl: 'https://example.com/custom.jpg',
      });

      expect(profile.photoUrl).toBe('https://example.com/custom.jpg');
    });
  });

  describe('Location subdocument', () => {
    test('should create profile with location object', () => {
      const profile = new Profile({
        userId: 'user123',
        location: {
          city: 'New York',
          state: 'NY',
        },
      });

      expect(profile.location).toBeDefined();
      expect(profile.location.city).toBe('New York');
      expect(profile.location.state).toBe('NY');
    });

    test('should create profile with partial location (city only)', () => {
      const profile = new Profile({
        userId: 'user123',
        location: {
          city: 'Boston',
        },
      });

      expect(profile.location.city).toBe('Boston');
      expect(profile.location.state).toBeUndefined();
    });

    test('should create profile with partial location (state only)', () => {
      const profile = new Profile({
        userId: 'user123',
        location: {
          state: 'TX',
        },
      });

      expect(profile.location.city).toBeUndefined();
      expect(profile.location.state).toBe('TX');
    });

    test('should create profile without location', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
      });

      expect(profile.location).toBeDefined();
      expect(profile.location.city).toBeUndefined();
      expect(profile.location.state).toBeUndefined();
    });

    test('should allow empty location object', () => {
      const profile = new Profile({
        userId: 'user123',
        location: {},
      });

      expect(profile.location).toBeDefined();
      expect(profile.location.city).toBeUndefined();
      expect(profile.location.state).toBeUndefined();
    });
  });

  describe('String fields', () => {
    test('should accept valid string for userId', () => {
      const profile = new Profile({ userId: 'user-abc-123' });
      expect(profile.userId).toBe('user-abc-123');
    });

    test('should accept valid string for fullName', () => {
      const profile = new Profile({ userId: 'user123', fullName: 'Jane Smith' });
      expect(profile.fullName).toBe('Jane Smith');
    });

    test('should accept valid string for email', () => {
      const profile = new Profile({ userId: 'user123', email: 'jane@example.com' });
      expect(profile.email).toBe('jane@example.com');
    });

    test('should accept valid string for phone', () => {
      const profile = new Profile({ userId: 'user123', phone: '+1-555-0123' });
      expect(profile.phone).toBe('+1-555-0123');
    });

    test('should accept valid string for headline', () => {
      const profile = new Profile({ userId: 'user123', headline: 'Product Manager' });
      expect(profile.headline).toBe('Product Manager');
    });

    test('should accept valid string for bio', () => {
      const longBio = 'A'.repeat(500);
      const profile = new Profile({ userId: 'user123', bio: longBio });
      expect(profile.bio).toBe(longBio);
    });

    test('should accept valid string for industry', () => {
      const profile = new Profile({ userId: 'user123', industry: 'Healthcare' });
      expect(profile.industry).toBe('Healthcare');
    });

    test('should accept valid string for experienceLevel', () => {
      const profile = new Profile({ userId: 'user123', experienceLevel: 'Mid-level' });
      expect(profile.experienceLevel).toBe('Mid-level');
    });

    test('should accept empty strings for optional fields', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: '',
        email: '',
        phone: '',
        headline: '',
        bio: '',
        industry: '',
        experienceLevel: '',
      });

      const validationError = profile.validateSync();
      expect(validationError).toBeUndefined();
    });

    test('should not accept empty string for required userId', () => {
      const profile = new Profile({
        userId: '',
        fullName: 'John Doe',
      });

      const validationError = profile.validateSync();
      // Empty string should fail validation for required fields in Mongoose
      expect(validationError).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
      expect(validationError.errors.userId.kind).toBe('required');
    });
  });

  describe('Timestamps', () => {
    test('should have timestamps enabled', () => {
      const schema = Profile.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    test('should have createdAt and updatedAt paths', () => {
      const schema = Profile.schema;
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    test('should have userId indexed', () => {
      const schema = Profile.schema;
      const userIdPath = schema.path('userId');
      
      expect(userIdPath.options.index).toBe(true);
    });

    test('should have userId as unique', () => {
      const schema = Profile.schema;
      const userIdPath = schema.path('userId');
      
      expect(userIdPath.options.unique).toBe(true);
    });

    test('should check schema indexes', () => {
      const schema = Profile.schema;
      const indexes = schema.indexes();
      
      // Check if there are any indexes defined
      expect(indexes).toBeDefined();
      expect(Array.isArray(indexes)).toBe(true);
    });
  });

  describe('Model usage', () => {
    test('should create model instance with new keyword', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
      });

      expect(profile).toBeInstanceOf(Profile);
      expect(profile).toBeInstanceOf(mongoose.Model);
    });

    test('should be registered as Profile model', () => {
      expect(mongoose.models.Profile).toBe(Profile);
    });
  });

  describe('Complex scenarios', () => {
    test('should handle profile with all optional fields undefined', () => {
      const profile = new Profile({
        userId: 'user123',
      });

      expect(profile.fullName).toBeUndefined();
      expect(profile.email).toBeUndefined();
      expect(profile.phone).toBeUndefined();
      expect(profile.headline).toBeUndefined();
      expect(profile.bio).toBeUndefined();
      expect(profile.industry).toBeUndefined();
      expect(profile.experienceLevel).toBeUndefined();
      expect(profile.profileType).toBe('default');
      expect(profile.photoUrl).toBe('');
    });

    test('should handle profile with mixed defined and undefined fields', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
        email: 'john@example.com',
        // phone undefined
        location: {
          city: 'Boston',
          // state undefined
        },
        // headline undefined
        bio: 'Developer',
        // industry undefined
      });

      expect(profile.fullName).toBe('John Doe');
      expect(profile.email).toBe('john@example.com');
      expect(profile.phone).toBeUndefined();
      expect(profile.location.city).toBe('Boston');
      expect(profile.location.state).toBeUndefined();
      expect(profile.headline).toBeUndefined();
      expect(profile.bio).toBe('Developer');
      expect(profile.industry).toBeUndefined();
    });

    test('should handle special characters in string fields', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: "John O'Connor",
        email: 'john+test@example.com',
        phone: '(555) 123-4567',
        headline: 'Engineer @ Tech-Corp',
        bio: 'Developer with 10+ years experience!',
      });

      const validationError = profile.validateSync();
      expect(validationError).toBeUndefined();
    });

    test('should handle very long strings', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'A'.repeat(200),
        bio: 'B'.repeat(2000),
        headline: 'C'.repeat(300),
      });

      // No maxlength constraints, so this should be valid
      const validationError = profile.validateSync();
      expect(validationError).toBeUndefined();
    });

    test('should handle unicode characters', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: '李明',
        location: {
          city: 'São Paulo',
          state: 'SP',
        },
        headline: 'Développeur',
        bio: 'Профессионал',
      });

      const validationError = profile.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe('Data integrity', () => {
    test('should maintain data after creation', () => {
      const originalData = {
        userId: 'user123',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        location: {
          city: 'San Francisco',
          state: 'CA',
        },
        headline: 'Software Engineer',
        bio: 'Experienced developer',
        industry: 'Technology',
        experienceLevel: 'Senior',
      };

      const profile = new Profile(originalData);

      // Check all fields maintained
      expect(profile.userId).toBe(originalData.userId);
      expect(profile.fullName).toBe(originalData.fullName);
      expect(profile.email).toBe(originalData.email);
      expect(profile.phone).toBe(originalData.phone);
      expect(profile.location.city).toBe(originalData.location.city);
      expect(profile.location.state).toBe(originalData.location.state);
      expect(profile.headline).toBe(originalData.headline);
      expect(profile.bio).toBe(originalData.bio);
      expect(profile.industry).toBe(originalData.industry);
      expect(profile.experienceLevel).toBe(originalData.experienceLevel);
    });

    test('should allow updating fields', () => {
      const profile = new Profile({
        userId: 'user123',
        fullName: 'John Doe',
      });

      profile.fullName = 'Jane Smith';
      profile.email = 'jane@example.com';
      profile.headline = 'Product Manager';

      expect(profile.fullName).toBe('Jane Smith');
      expect(profile.email).toBe('jane@example.com');
      expect(profile.headline).toBe('Product Manager');
    });

    test('should allow updating location fields', () => {
      const profile = new Profile({
        userId: 'user123',
        location: {
          city: 'Boston',
          state: 'MA',
        },
      });

      profile.location.city = 'New York';
      profile.location.state = 'NY';

      expect(profile.location.city).toBe('New York');
      expect(profile.location.state).toBe('NY');
    });
  });

  describe('Schema options', () => {
    test('should have correct schema type definitions', () => {
      const schema = Profile.schema;
      
      expect(schema.path('userId').instance).toBe('String');
      expect(schema.path('fullName').instance).toBe('String');
      expect(schema.path('email').instance).toBe('String');
      expect(schema.path('phone').instance).toBe('String');
      expect(schema.path('headline').instance).toBe('String');
      expect(schema.path('bio').instance).toBe('String');
      expect(schema.path('industry').instance).toBe('String');
      expect(schema.path('experienceLevel').instance).toBe('String');
      expect(schema.path('profileType').instance).toBe('String');
      expect(schema.path('photoUrl').instance).toBe('String');
    });

    test('should have location as embedded document', () => {
      const schema = Profile.schema;
      
      // location is an inline object, so check the nested paths directly
      expect(schema.path('location.city')).toBeDefined();
      expect(schema.path('location.state')).toBeDefined();
      expect(schema.path('location.city').instance).toBe('String');
      expect(schema.path('location.state').instance).toBe('String');
    });

    test('should have userId as required', () => {
      const schema = Profile.schema;
      const userIdPath = schema.path('userId');
      
      expect(userIdPath.isRequired).toBe(true);
    });
  });
});