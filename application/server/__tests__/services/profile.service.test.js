// __tests__/services/profile.test.js
import { jest } from '@jest/globals';

// ✅ ESM-compatible mocking
const mockCollection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
};

// Mock the db connection module before importing the service
jest.unstable_mockModule('../../db/connection.js', () => ({
  getDb: jest.fn(() => mockDb),
}));

// Dynamically import AFTER the mock
const { getProfileByUserId, upsertProfileByUserId } = await import('../../services/profile.js');
const { getDb } = await import('../../db/connection.js');

describe('Profile Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.collection.mockReturnValue(mockCollection);
  });

  describe('getProfileByUserId', () => {
    it('should return the profile for a given userId', async () => {
      const fakeProfile = { userId: '123', name: 'Alice' };
      mockCollection.findOne.mockResolvedValue(fakeProfile);

      const result = await getProfileByUserId('123');

      expect(getDb).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('profiles');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ userId: '123' });
      expect(result).toEqual(fakeProfile);
    });
  });

  describe('upsertProfileByUserId', () => {
    it('should upsert and return the profile', async () => {
      const fakeData = { name: 'Bob' };
      const fakeUserId = 'abc123';
      const fakeUpdatedProfile = { userId: fakeUserId, name: 'Bob' };

      mockCollection.updateOne.mockResolvedValue({ acknowledged: true });
      mockCollection.findOne.mockResolvedValue(fakeUpdatedProfile);

      const result = await upsertProfileByUserId(fakeUserId, fakeData);

      expect(getDb).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('profiles');
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { userId: fakeUserId },
        expect.objectContaining({
          $set: expect.objectContaining({
            userId: fakeUserId,
            name: 'Bob',
          }),
          $setOnInsert: expect.any(Object),
        }),
        { upsert: true }
      );
      expect(mockCollection.findOne).toHaveBeenCalledWith({ userId: fakeUserId });
      expect(result).toEqual(fakeUpdatedProfile);
    });
  });
});
