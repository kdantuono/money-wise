/**
 * Specification Pattern Interface
 *
 * Implements the Specification pattern for composable, reusable business rules.
 * Each specification encapsulates a single business rule and can be combined
 * with other specifications using AND, OR, NOT operations.
 *
 * Benefits:
 * - Single Responsibility: Each spec handles one rule
 * - Open/Closed: New specs can be added without modifying existing code
 * - Testability: Each spec can be unit tested in isolation
 * - Reusability: Specs can be composed and reused across the application
 *
 * @pattern Specification Pattern (Domain-Driven Design)
 * @see https://martinfowler.com/apsupp/spec.pdf
 */

/**
 * Result of a specification check
 */
export interface SpecificationResult {
  /** Whether the specification is satisfied */
  isSatisfied: boolean;
  /** Error message if not satisfied */
  errorMessage?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
}

/**
 * Base specification interface
 * @template T The type of object being validated
 */
export interface ISpecification<T> {
  /**
   * Check if the specification is satisfied
   * @param candidate The object to check
   * @returns Result indicating satisfaction and any error details
   */
  isSatisfiedBy(candidate: T): Promise<SpecificationResult>;

  /**
   * Combine with another specification using AND logic
   * @param other The specification to combine with
   * @returns A new composite specification
   */
  and(other: ISpecification<T>): ISpecification<T>;

  /**
   * Combine with another specification using OR logic
   * @param other The specification to combine with
   * @returns A new composite specification
   */
  or(other: ISpecification<T>): ISpecification<T>;

  /**
   * Negate this specification
   * @returns A new negated specification
   */
  not(): ISpecification<T>;
}

/**
 * Abstract base class implementing common specification logic
 */
export abstract class Specification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): Promise<SpecificationResult>;

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

/**
 * Composite specification that requires all specifications to be satisfied (AND)
 */
export class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  async isSatisfiedBy(candidate: T): Promise<SpecificationResult> {
    const leftResult = await this.left.isSatisfiedBy(candidate);
    if (!leftResult.isSatisfied) {
      return leftResult;
    }

    return this.right.isSatisfiedBy(candidate);
  }
}

/**
 * Composite specification that requires at least one specification to be satisfied (OR)
 */
export class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>,
  ) {
    super();
  }

  async isSatisfiedBy(candidate: T): Promise<SpecificationResult> {
    const leftResult = await this.left.isSatisfiedBy(candidate);
    if (leftResult.isSatisfied) {
      return leftResult;
    }

    return this.right.isSatisfiedBy(candidate);
  }
}

/**
 * Specification that negates another specification (NOT)
 */
export class NotSpecification<T> extends Specification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super();
  }

  async isSatisfiedBy(candidate: T): Promise<SpecificationResult> {
    const result = await this.spec.isSatisfiedBy(candidate);
    return {
      isSatisfied: !result.isSatisfied,
      errorMessage: result.isSatisfied
        ? 'Condition should not be met'
        : undefined,
    };
  }
}

/**
 * Always satisfied specification (useful for optional validations)
 */
export class AlwaysSatisfiedSpecification<T> extends Specification<T> {
  async isSatisfiedBy(): Promise<SpecificationResult> {
    return { isSatisfied: true };
  }
}

/**
 * Never satisfied specification (useful for testing)
 */
export class NeverSatisfiedSpecification<T> extends Specification<T> {
  constructor(
    private readonly errorMessage: string = 'Specification not satisfied',
    private readonly errorCode: string = 'SPEC_NOT_SATISFIED',
  ) {
    super();
  }

  async isSatisfiedBy(): Promise<SpecificationResult> {
    return {
      isSatisfied: false,
      errorMessage: this.errorMessage,
      errorCode: this.errorCode,
    };
  }
}
