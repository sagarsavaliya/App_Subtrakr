import 'package:intl/intl.dart';

class CurrencyUtils {
  CurrencyUtils._();

  static final _inrWhole = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );
  static final _inrDecimal = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 2,
  );

  static String formatWhole(num amount) => _inrWhole.format(amount);
  static String formatDecimal(num amount) => _inrDecimal.format(amount);
}
