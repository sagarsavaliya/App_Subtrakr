import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../models/entity_model.dart';
import '../models/payment_history_model.dart';
import '../models/subscription_model.dart';

/// Seed data for local development — stands in for the Supabase-backed
/// repository layer until a live project is connected.
class MockData {
  MockData._();

  static final personal = const EntityModel(
    id: 'ent-personal',
    name: 'Personal',
    type: EntityType.personal,
  );
  static final akshara = const EntityModel(
    id: 'ent-akshara',
    name: 'Akshara Technologies',
    type: EntityType.company,
    gstNumber: '24AAACA1234A1Z5',
  );

  static List<EntityModel> get entities => [personal, akshara];

  static final DateTime _now = DateTime.now();

  static List<SubscriptionModel> get subscriptions => [
    SubscriptionModel(
      id: 'sub-claude',
      entityId: akshara.id,
      name: 'Claude Pro',
      initials: 'C',
      category: SubscriptionCategory.devTools,
      amount: 1650,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 28)),
      nextDueDate: _now.add(const Duration(days: 2)),
      isAutoDebit: true,
    ),
    SubscriptionModel(
      id: 'sub-cursor',
      entityId: akshara.id,
      name: 'Cursor Pro',
      initials: 'CU',
      category: SubscriptionCategory.devTools,
      amount: 1650,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 10)),
      nextDueDate: _now.add(const Duration(days: 20)),
      isAutoDebit: true,
    ),
    SubscriptionModel(
      id: 'sub-aws',
      entityId: akshara.id,
      name: 'AWS',
      initials: 'A',
      category: SubscriptionCategory.cloud,
      amount: 6200,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 31)),
      nextDueDate: _now.subtract(const Duration(days: 1)),
      isAutoDebit: false,
    ),
    SubscriptionModel(
      id: 'sub-workspace',
      entityId: akshara.id,
      name: 'Google Workspace',
      initials: 'G',
      category: SubscriptionCategory.cloud,
      amount: 840,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 25)),
      nextDueDate: _now.add(const Duration(days: 5)),
      isAutoDebit: true,
    ),
    SubscriptionModel(
      id: 'sub-copilot',
      entityId: akshara.id,
      name: 'GitHub Copilot',
      initials: 'GH',
      category: SubscriptionCategory.devTools,
      amount: 825,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 14)),
      nextDueDate: _now.add(const Duration(days: 16)),
      isAutoDebit: true,
    ),
    SubscriptionModel(
      id: 'sub-netflix',
      entityId: personal.id,
      name: 'Netflix',
      initials: 'N',
      category: SubscriptionCategory.entertainment,
      amount: 649,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 18)),
      nextDueDate: _now.add(const Duration(days: 12)),
      invoiceCount: 3,
    ),
    SubscriptionModel(
      id: 'sub-spotify',
      entityId: personal.id,
      name: 'Spotify',
      initials: 'S',
      category: SubscriptionCategory.entertainment,
      amount: 119,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 5)),
      nextDueDate: _now.add(const Duration(days: 25)),
    ),
    SubscriptionModel(
      id: 'sub-jio',
      entityId: personal.id,
      name: 'Jio Postpaid',
      initials: 'J',
      category: SubscriptionCategory.telecom,
      amount: 399,
      billingCycle: BillingCycle.monthly,
      startDate: _now.subtract(const Duration(days: 29)),
      nextDueDate: _now.add(const Duration(days: 3)),
    ),
  ];

  static List<PaymentHistoryModel> get paymentHistory => [
    // Kept within the last couple of days (rather than 28/18 days back) so
    // a default "this month" GST export has real Akshara Technologies line
    // items regardless of which day of the month the app happens to run on.
    PaymentHistoryModel(
      id: 'pay-1',
      subscriptionId: 'sub-claude',
      paidDate: _now.subtract(const Duration(days: 2)),
      amountPaid: 1650,
      source: PaymentSource.shareDetected,
    ),
    PaymentHistoryModel(
      id: 'pay-2',
      subscriptionId: 'sub-netflix',
      paidDate: _now.subtract(const Duration(days: 1)),
      amountPaid: 649,
      source: PaymentSource.manual,
    ),
    PaymentHistoryModel(
      id: 'pay-3',
      subscriptionId: 'sub-aws',
      paidDate: _now.subtract(const Duration(days: 1)),
      amountPaid: 6200,
      source: PaymentSource.manual,
    ),
    PaymentHistoryModel(
      id: 'pay-4',
      subscriptionId: 'sub-workspace',
      paidDate: _now.subtract(const Duration(days: 2)),
      amountPaid: 840,
      source: PaymentSource.manual,
    ),
    PaymentHistoryModel(
      id: 'pay-5',
      subscriptionId: 'sub-copilot',
      paidDate: _now.subtract(const Duration(days: 1)),
      amountPaid: 825,
      source: PaymentSource.shareDetected,
    ),
  ];

  /// Monogram color per subscription id — content-identity, not UI accent.
  static Color logoColor(String subscriptionId) => switch (subscriptionId) {
    'sub-claude' => AppColors.serviceClaude,
    'sub-cursor' => AppColors.serviceClaude,
    'sub-aws' => AppColors.serviceAws,
    'sub-workspace' => AppColors.serviceGoogle,
    'sub-copilot' => AppColors.serviceGithub,
    'sub-netflix' => AppColors.serviceNetflix,
    'sub-spotify' => AppColors.serviceSpotify,
    'sub-jio' => AppColors.serviceJio,
    _ => AppColors.accentA,
  };
}
