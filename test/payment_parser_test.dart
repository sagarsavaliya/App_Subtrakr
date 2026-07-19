import 'package:flutter_test/flutter_test.dart';
import 'package:subtrakr/data/models/subscription_model.dart';
import 'package:subtrakr/services/payment_parser.dart';

SubscriptionModel _sub(
  String id,
  String name,
  double amount, {
  SubscriptionStatus status = SubscriptionStatus.active,
  DateTime? nextDue,
}) {
  return SubscriptionModel(
    id: id,
    entityId: 'e1',
    name: name,
    initials: name.substring(0, 1).toUpperCase(),
    category: SubscriptionCategory.other,
    amount: amount,
    billingCycle: BillingCycle.monthly,
    startDate: DateTime(2026, 1, 1),
    nextDueDate: nextDue ?? DateTime(2026, 8, 1),
    status: status,
  );
}

void main() {
  group('PaymentParser.extractAmount', () {
    test('parses ₹ symbol amounts', () {
      expect(PaymentParser.extractAmount('Paid ₹649 to NETFLIX'), 649);
    });

    test('parses Rs. with decimals and commas', () {
      expect(
        PaymentParser.extractAmount(
          'Rs. 1,499.00 debited from A/c XX1234 on 15-07-26',
        ),
        1499.00,
      );
    });

    test('parses INR amounts', () {
      expect(
        PaymentParser.extractAmount('INR 199.00 debited via UPI to Spotify'),
        199.00,
      );
    });

    test('parses verb-form amounts with no currency marker', () {
      expect(
        PaymentParser.extractAmount('debited by 549.50 on 12-07-2026'),
        549.50,
      );
    });

    test('returns null when no amount present', () {
      expect(PaymentParser.extractAmount('Your OTP is 482913'), isNull);
    });

    test('does not treat the OTP digits as an amount', () {
      // No currency marker or debit verb ahead of the number.
      expect(PaymentParser.extractAmount('Use code 4829 to log in'), isNull);
    });
  });

  group('PaymentParser.match', () {
    final subs = [
      _sub('n1', 'Netflix', 649, nextDue: DateTime(2026, 7, 25)),
      _sub('s1', 'Spotify', 199, nextDue: DateTime(2026, 7, 22)),
      _sub('a1', 'Adobe CC', 1499, nextDue: DateTime(2026, 8, 3)),
      _sub('c1', 'Cancelled Svc', 999, status: SubscriptionStatus.cancelled),
    ];

    test('matches by name in text', () {
      final m = PaymentParser.match(
        subs,
        'INR 649.00 debited to NETFLIX.COM on 15-07',
        amount: 649,
      );
      expect(m?.id, 'n1');
    });

    test('matches by name case-insensitively without amount', () {
      final m = PaymentParser.match(subs, 'Payment made to spotify india');
      expect(m?.id, 's1');
    });

    test('name match wins over amount match on a different sub', () {
      // Amount says Spotify (199) but text names Adobe.
      final m = PaymentParser.match(
        subs,
        'Rs 199 charged by Adobe CC',
        amount: 199,
      );
      expect(m?.id, 'a1');
    });

    test('unique amount alone is accepted', () {
      final m = PaymentParser.match(
        subs,
        'A/c XX1234 debited Rs.1,499.00 via NACH',
        amount: 1499,
      );
      expect(m?.id, 'a1');
    });

    test('amount tolerance covers small drift', () {
      final m = PaymentParser.match(
        subs,
        'debited by 650.00 towards mandate',
        amount: 650,
      );
      expect(m?.id, 'n1');
    });

    test('ambiguous bare-amount match is rejected', () {
      final ambiguous = [
        _sub('x1', 'Service One', 499),
        _sub('x2', 'Service Two', 499),
      ];
      final m = PaymentParser.match(
        ambiguous,
        'Rs 499 debited via UPI',
        amount: 499,
      );
      expect(m, isNull);
    });

    test('cancelled subscriptions never match', () {
      final m = PaymentParser.match(
        subs,
        'Rs 999 paid to Cancelled Svc',
        amount: 999,
      );
      expect(m, isNull);
    });

    test('no signal returns null', () {
      final m = PaymentParser.match(subs, 'Hello, how are you?');
      expect(m, isNull);
    });
  });
}
