import { Injectable } from '@nestjs/common';
import { Transaction } from '../../transactions/transaction.entity';
import { MLFeatures, MLPrediction } from '@money-wise/types';

@Injectable()
export class TransactionMLModel {
  private readonly modelVersion = '1.0.0';

  async predict(transaction: Transaction): Promise<MLPrediction> {
    // Extract features from transaction
    const features = this.extractFeatures(transaction);

    // Simple rule-based categorization as a placeholder for ML model
    const description = transaction.description.toLowerCase();
    const merchantName = transaction.merchantName?.toLowerCase() || '';

    let categoryId = 'other';
    let confidence = 0.5;

    // Food & Dining
    if (this.containsKeywords(description + ' ' + merchantName, [
      'restaurant', 'food', 'dining', 'grocery', 'starbucks', 'mcdonalds',
      'subway', 'pizza', 'cafe', 'delivery', 'doordash', 'ubereats'
    ])) {
      categoryId = 'Food & Dining';
      confidence = 0.85;
    }
    // Transportation
    else if (this.containsKeywords(description + ' ' + merchantName, [
      'gas', 'fuel', 'uber', 'lyft', 'taxi', 'metro', 'bus', 'parking',
      'shell', 'chevron', 'exxon', 'bp'
    ])) {
      categoryId = 'Transportation';
      confidence = 0.8;
    }
    // Shopping
    else if (this.containsKeywords(description + ' ' + merchantName, [
      'amazon', 'target', 'walmart', 'store', 'shop', 'retail', 'purchase'
    ])) {
      categoryId = 'Shopping';
      confidence = 0.75;
    }
    // Bills & Utilities
    else if (this.containsKeywords(description + ' ' + merchantName, [
      'electric', 'utility', 'phone', 'internet', 'rent', 'mortgage', 'bill'
    ])) {
      categoryId = 'Bills & Utilities';
      confidence = 0.9;
    }
    // Entertainment
    else if (this.containsKeywords(description + ' ' + merchantName, [
      'netflix', 'spotify', 'movie', 'theater', 'entertainment', 'gaming'
    ])) {
      categoryId = 'Entertainment';
      confidence = 0.8;
    }
    // Income
    else if (transaction.amount > 0 && this.containsKeywords(description, [
      'salary', 'payroll', 'deposit', 'income', 'payment'
    ])) {
      categoryId = 'Income';
      confidence = 0.9;
    }

    return {
      categoryId,
      confidence,
      modelVersion: this.modelVersion,
      features
    };
  }

  private extractFeatures(transaction: Transaction): MLFeatures {
    const date = new Date(transaction.date);
    const amount = Math.abs(transaction.amount);

    return {
      amount: amount,
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
      merchantNameLength: transaction.merchantName?.length || 0,
      descriptionLength: transaction.description.length,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      amountBucket: this.getAmountBucket(amount),
      transactionType: transaction.type,
    };
  }

  private getAmountBucket(amount: number): string {
    if (amount < 10) return 'small';
    if (amount < 50) return 'medium';
    if (amount < 200) return 'large';
    return 'extra_large';
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  getModelVersion(): string {
    return this.modelVersion;
  }
}