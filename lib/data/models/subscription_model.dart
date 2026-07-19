import 'package:equatable/equatable.dart';

enum BillingCycle { weekly, monthly, quarterly, halfYearly, yearly, custom }

enum SubscriptionStatus { active, paused, cancelled, trial }

enum SubscriptionCategory {
  devTools,
  entertainment,
  telecom,
  cloud,
  saas,
  utility,
  storage,
  security,
  productivity,
  other,
}

extension BillingCycleLabel on BillingCycle {
  String get label => switch (this) {
    BillingCycle.weekly => 'Weekly',
    BillingCycle.monthly => 'Monthly',
    BillingCycle.quarterly => 'Quarterly',
    BillingCycle.halfYearly => 'Half-yearly',
    BillingCycle.yearly => 'Yearly',
    BillingCycle.custom => 'Custom',
  };
}

extension SubscriptionCategoryLabel on SubscriptionCategory {
  String get label => switch (this) {
    SubscriptionCategory.devTools => 'DevTools',
    SubscriptionCategory.entertainment => 'Entertainment',
    SubscriptionCategory.telecom => 'Telecom',
    SubscriptionCategory.cloud => 'Cloud',
    SubscriptionCategory.saas => 'SaaS',
    SubscriptionCategory.utility => 'Utility',
    SubscriptionCategory.storage => 'Storage',
    SubscriptionCategory.security => 'Security',
    SubscriptionCategory.productivity => 'Productivity',
    SubscriptionCategory.other => 'Other',
  };
}

class SubscriptionModel extends Equatable {
  const SubscriptionModel({
    required this.id,
    required this.entityId,
    required this.name,
    required this.initials,
    required this.category,
    required this.amount,
    this.currency = 'INR',
    required this.billingCycle,
    this.customCycleDays,
    required this.startDate,
    required this.nextDueDate,
    this.status = SubscriptionStatus.active,
    this.isAutoDebit = false,
    this.remindDaysBefore = 3,
    this.invoiceCount = 0,
  });

  final String id;
  final String entityId;
  final String name;
  final String initials;
  final SubscriptionCategory category;
  final double amount;
  final String currency;
  final BillingCycle billingCycle;
  final int? customCycleDays;
  final DateTime startDate;
  final DateTime nextDueDate;
  final SubscriptionStatus status;
  final bool isAutoDebit;
  final int remindDaysBefore;
  final int invoiceCount;

  bool get isOverdue =>
      nextDueDate.isBefore(DateTime.now()) &&
      status == SubscriptionStatus.active;
  bool get isDueSoon =>
      nextDueDate.difference(DateTime.now()).inDays <= remindDaysBefore &&
      !isOverdue;

  int get daysUntilDue => nextDueDate.difference(DateTime.now()).inDays;

  double get monthlyEquivalent {
    switch (billingCycle) {
      case BillingCycle.weekly:
        return amount * 4.33;
      case BillingCycle.monthly:
        return amount;
      case BillingCycle.quarterly:
        return amount / 3;
      case BillingCycle.halfYearly:
        return amount / 6;
      case BillingCycle.yearly:
        return amount / 12;
      case BillingCycle.custom:
        return amount / ((customCycleDays ?? 30) / 30);
    }
  }

  DateTime computeNextDue(DateTime fromDate) {
    switch (billingCycle) {
      case BillingCycle.weekly:
        return fromDate.add(const Duration(days: 7));
      case BillingCycle.monthly:
        return DateTime(fromDate.year, fromDate.month + 1, fromDate.day);
      case BillingCycle.quarterly:
        return DateTime(fromDate.year, fromDate.month + 3, fromDate.day);
      case BillingCycle.halfYearly:
        return DateTime(fromDate.year, fromDate.month + 6, fromDate.day);
      case BillingCycle.yearly:
        return DateTime(fromDate.year + 1, fromDate.month, fromDate.day);
      case BillingCycle.custom:
        return fromDate.add(Duration(days: customCycleDays ?? 30));
    }
  }

  SubscriptionModel copyWith({
    SubscriptionStatus? status,
    DateTime? nextDueDate,
    int? invoiceCount,
  }) {
    return SubscriptionModel(
      id: id,
      entityId: entityId,
      name: name,
      initials: initials,
      category: category,
      amount: amount,
      currency: currency,
      billingCycle: billingCycle,
      customCycleDays: customCycleDays,
      startDate: startDate,
      nextDueDate: nextDueDate ?? this.nextDueDate,
      status: status ?? this.status,
      isAutoDebit: isAutoDebit,
      remindDaysBefore: remindDaysBefore,
      invoiceCount: invoiceCount ?? this.invoiceCount,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'entityId': entityId,
    'name': name,
    'initials': initials,
    'category': category.name,
    'amount': amount,
    'currency': currency,
    'billingCycle': billingCycle.name,
    'customCycleDays': customCycleDays,
    'startDate': startDate.toIso8601String(),
    'nextDueDate': nextDueDate.toIso8601String(),
    'status': status.name,
    'isAutoDebit': isAutoDebit,
    'remindDaysBefore': remindDaysBefore,
    'invoiceCount': invoiceCount,
  };

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionModel(
      id: json['id'] as String,
      entityId: json['entityId'] as String,
      name: json['name'] as String,
      initials: json['initials'] as String,
      category: SubscriptionCategory.values.byName(json['category'] as String),
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'INR',
      billingCycle: BillingCycle.values.byName(json['billingCycle'] as String),
      customCycleDays: json['customCycleDays'] as int?,
      startDate: DateTime.parse(json['startDate'] as String),
      nextDueDate: DateTime.parse(json['nextDueDate'] as String),
      status: SubscriptionStatus.values.byName(json['status'] as String? ?? 'active'),
      isAutoDebit: json['isAutoDebit'] as bool? ?? false,
      remindDaysBefore: json['remindDaysBefore'] as int? ?? 3,
      invoiceCount: json['invoiceCount'] as int? ?? 0,
    );
  }

  @override
  List<Object?> get props => [
    id,
    entityId,
    name,
    amount,
    billingCycle,
    nextDueDate,
    status,
  ];
}
