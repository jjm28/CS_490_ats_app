import { jest } from '@jest/globals';

// --------------------
// Mock bcrypt
// --------------------
const bcryptMock = {
  hash: jest.fn(),
  compare: jest.fn(),
};
await jest.unstable_mockModule('bcrypt', () => bcryptMock);

// --------------------
// Mock MongoDB
// --------------------
const mockCollection = {
  insertOne: jest.fn(),
  findOne: jest.fn(),
};
const mockDb = {
  collection: jest.fn(() => mockCollection),
};
await jest.unstable_mockModule('../../db/connection.js', () => ({
  getDb: jest.fn(() => mockDb),
}));

// --------------------
// Import service after mocks
// --------------------
const {
  createUser,
  verifyUser,
  findUserByEmail,
  findUserByEmailCaseSensitve,
} = await import('../../services/user.service.js');

const bcrypt = await import('bcrypt');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.collection.mockReturnValue(mockCollection);
  });

  // --------------------
  // createUser
  // --------------------
  describe('createUser', () => {
    it('hashes the password and inserts user', async () => {
      bcrypt.hash.mockResolvedValue('hashedpassword');
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'user123' });

      const user = await createUser({
        email: 'Test@Email.com',
        password: 'pass123',
        firstName: 'Alice',
        lastName: 'Smith',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@email.com',
          passwordHash: 'hashedpassword',
          firstName: 'Alice',
          lastName: 'Smith',
        })
      );
      expect(user).toEqual({
        _id: 'user123',
        email: 'test@email.com',
        firstName: 'Alice',
        lastName: 'Smith',
      });
    });

    it('creates user without password', async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'user456' });

      const user = await createUser({
        email: 'nopass@example.com',
        password: null,
        firstName: 'Bob',
        lastName: 'Jones',
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(user).toEqual({
        _id: 'user456',
        email: 'nopass@example.com',
        firstName: 'Bob',
        lastName: 'Jones',
      });
    });
  });

  // --------------------
  // verifyUser
  // --------------------
  describe('verifyUser', () => {
    it('verifies correct password', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: 'user123', passwordHash: 'hashedpass' });
      bcrypt.compare.mockResolvedValue(true);

      const user = await verifyUser({ email: 'test@email.com', password: 'pass' }, false);

      expect(bcrypt.compare).toHaveBeenCalledWith('pass', 'hashedpass');
      expect(user).toEqual({ _id: 'user123', email: 'test@email.com' });
    });

    it('throws error if user not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      await expect(
        verifyUser({ email: 'noone@email.com', password: 'pass' }, false)
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws error if password is wrong', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: 'user123', passwordHash: 'hashedpass' });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        verifyUser({ email: 'test@email.com', password: 'wrong' }, false)
      ).rejects.toThrow('Invalid credentials');
    });

    it('skips password check if isprovider is true', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: 'user123', passwordHash: 'hashedpass' });

      const user = await verifyUser({ email: 'provider@email.com', password: 'pass' }, true);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(user).toEqual({ _id: 'user123', email: 'provider@email.com' });
    });
  });

  // --------------------
  // findUserByEmail
  // --------------------
  describe('findUserByEmail', () => {
    it('finds user case-insensitively', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: '1', email: 'test@email.com' });

      const user = await findUserByEmail('TEST@EMAIL.COM');

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'test@email.com' });
      expect(user).toEqual({ _id: '1', email: 'test@email.com' });
    });
  });

  // --------------------
  // findUserByEmailCaseSensitve
  // --------------------
  describe('findUserByEmailCaseSensitve', () => {
    it('finds user case-sensitively', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: '1', email: 'Exact@Email.com' });

      const user = await findUserByEmailCaseSensitve('Exact@Email.com');

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'Exact@Email.com' });
      expect(user).toEqual({ _id: '1', email: 'Exact@Email.com' });
    });
  });
});
