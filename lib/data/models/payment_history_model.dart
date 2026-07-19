import 'package:equatable/equatable.dart';

enum PaymentSource { manual, shareDetected, auto }

class PaymentHistoryModel extends Equatable {
  const PaymentHistoryModel({
    required this.id,
    required this.subscriptionId,
    required this.paidDate,
    required this.amountPaid,
    this.currency = 'INR',
    this.source = PaymentSource.manual,
  });

  final String id;
  final String subscriptionId;
  final DateTime paidDate;
  final double amountPaid;
  final String currency;
  final PaymentSource source;

  Map<String, dynamic> toJson() => {
    'id': id,
    'subscriptionId': subscriptionId,
    'paidDate': paidDate.toIso8601String(),
    'amountPaid': amountPaid,
    'currency': currency,
    'source': source.name,
  };

  factory PaymentHistoryModel.fromJson(Map<String, dynamic> json) {
    return PaymentHistoryModel(
      id: json['id'] as String,
      subscriptionId: json['subscriptionId'] as String,
      paidDate: DateTime.parse(json['paidDate'] as String),
      amountPaid: (json['amountPaid'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'INR',
      source: PaymentSource.values.byName(json['source'] as String? ?? 'manual'),
    );
  }

  @override
  List<Object?> get props => [id, subscriptionId, paidDate, amountPaid];
}
