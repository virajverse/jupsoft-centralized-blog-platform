/**
 * ALL EXCEPTIONS FILTER TESTS — Velocity Pillar 1 (Error Handling)
 * Tests: HttpException, Prisma P2002, P2025, P2003, generic Errors, response envelope
 */
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockRequest = {
      method: 'POST',
      url: '/admin/blogs',
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should format standard HttpException into consistent JSON envelope', () => {
    const notFound = new NotFoundException('Blog article not found');
    filter.catch(notFound, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'NOT_FOUND',
        message: 'Blog article not found',
        path: '/admin/blogs',
      }),
    );
  });

  it('should map Prisma P2002 unique constraint violation to HTTP 409 Conflict', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.4.1',
      meta: { target: ['slug', 'lang'] },
    });

    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'RESOURCE_ALREADY_EXISTS',
        message: 'A resource with this slug, lang already exists.',
        path: '/admin/blogs',
      }),
    );
  });

  it('should map Prisma P2025 record not found to HTTP 404 Not Found', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record to update not found', {
      code: 'P2025',
      clientVersion: '6.4.1',
    });

    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found or has been deleted.',
        path: '/admin/blogs',
      }),
    );
  });

  it('should map Prisma P2003 foreign key violation to HTTP 400 Bad Request', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '6.4.1',
    });

    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'RELATION_CONSTRAINT_VIOLATION',
        message: 'Foreign key relation constraint violation.',
        path: '/admin/blogs',
      }),
    );
  });

  it('should map PrismaClientInitializationError to HTTP 503 Service Unavailable', () => {
    const initError = new Prisma.PrismaClientInitializationError('PostgreSQL unreachable', '6.4.1');

    filter.catch(initError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: 'DATABASE_UNAVAILABLE',
        path: '/admin/blogs',
      }),
    );
  });

  it('should shield internal database stack traces from generic Error in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const secretDbError = new Error('SELECT * FROM "users" WHERE secret_token = "abc"; connect ETIMEDOUT');
    filter.catch(secretDbError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred processing your request.',
        path: '/admin/blogs',
      }),
    );

    process.env.NODE_ENV = originalEnv;
  });
});
