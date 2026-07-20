import 'package:flutter_test/flutter_test.dart';
import 'package:subtrakr/services/auth_service.dart';

void main() {
  group('AuthService.normalizePhone', () {
    test('bare 10-digit number gets +91 prefix', () {
      expect(AuthService.normalizePhone('9876543210'), '+919876543210');
    });

    test('already-prefixed number passes through', () {
      expect(AuthService.normalizePhone('+919876543210'), '+919876543210');
    });

    test('strips spaces and dashes before prefixing', () {
      expect(AuthService.normalizePhone('98765 43210'), '+919876543210');
      expect(AuthService.normalizePhone('98765-43210'), '+919876543210');
    });
  });

  group('AuthService.isValidIndianMobile', () {
    test('accepts valid 10-digit numbers starting 6-9', () {
      for (final prefix in ['6', '7', '8', '9']) {
        expect(
          AuthService.isValidIndianMobile('${prefix}123456789'),
          isTrue,
          reason: '$prefix-prefixed number should be valid',
        );
      }
    });

    test('rejects numbers starting 0-5', () {
      expect(AuthService.isValidIndianMobile('5123456789'), isFalse);
      expect(AuthService.isValidIndianMobile('0123456789'), isFalse);
    });

    test('rejects wrong length', () {
      expect(AuthService.isValidIndianMobile('98765432'), isFalse);
      expect(AuthService.isValidIndianMobile('987654321099'), isFalse);
    });

    test('accepts already-prefixed valid number', () {
      expect(AuthService.isValidIndianMobile('+919876543210'), isTrue);
    });
  });
}
