import '../data/models/subscription_model.dart';

/// Pure-Dart parsing/matching for shared bank SMS / payment-notification
/// text (the share-intent capture flow — see the payment-detection
/// compliance note for why this is share-based, not SMS-reading).
class PaymentParser {
  PaymentParser._();

  static final _currencyAmount = RegExp(
    r'(?:₹|INR|Rs\.?)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)',
    caseSensitive: false,
  );
  static final _verbAmount = RegExp(
    r'(?:debited|paid|charged|deducted)\s*(?:by|with|for|of)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)',
    caseSensitive: false,
  );

  static double? extractAmount(String text) {
    final m = _currencyAmount.firstMatch(text) ?? _verbAmount.firstMatch(text);
    if (m == null) return null;
    return double.tryParse(m.group(1)!.replaceAll(',', ''));
  }

  /// Finds the subscription the shared text most plausibly refers to.
  /// Name-in-text is the strong signal; amount agreement (within 2% or ₹2,
  /// covering rounding and small FX/fee drift) is the weak one. A bare
  /// amount hit alone is accepted only when it's unambiguous — otherwise
  /// nearest due date breaks ties among equal scorers.
  static SubscriptionModel? match(
    List<SubscriptionModel> subscriptions,
    String text, {
    double? amount,
  }) {
    final haystack = text.toLowerCase();
    final active = subscriptions
        .where((s) =>
            s.status == SubscriptionStatus.active ||
            s.status == SubscriptionStatus.trial)
        .toList();
    if (active.isEmpty) return null;

    int scoreOf(SubscriptionModel s) {
      var score = 0;
      final name = s.name.toLowerCase();
      final compactName = name.replaceAll(RegExp(r'[^a-z0-9]'), '');
      final compactText = haystack.replaceAll(RegExp(r'[^a-z0-9]'), '');
      if (haystack.contains(name) || compactText.contains(compactName)) {
        score += 2;
      }
      if (amount != null &&
          (amount - s.amount).abs() <= _amountTolerance(s.amount)) {
        score += 1;
      }
      return score;
    }

    final scored = [
      for (final s in active)
        if (scoreOf(s) > 0) (sub: s, score: scoreOf(s)),
    ]..sort((a, b) {
        if (b.score != a.score) return b.score.compareTo(a.score);
        return a.sub.nextDueDate.compareTo(b.sub.nextDueDate);
      });

    if (scored.isEmpty) return null;
    final best = scored.first;

    // A lone amount match is too weak to nudge on when several
    // subscriptions share that price point.
    if (best.score == 1 && scored.where((e) => e.score == 1).length > 1) {
      return null;
    }
    return best.sub;
  }

  static double _amountTolerance(double amount) {
    final pct = amount * 0.02;
    return pct > 2 ? pct : 2;
  }
}
