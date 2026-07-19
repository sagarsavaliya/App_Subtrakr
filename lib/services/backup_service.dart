import 'dart:convert';
import 'dart:typed_data';

import '../data/datasources/local_datasource.dart';
import 'export_service.dart';

class BackupService {
  BackupService._();

  /// Shares a full JSON backup of everything in local storage (including
  /// invoice files, which are not cloud-synced in v1 — this is their only
  /// escape hatch). On web this downloads the file.
  static Future<void> shareFullBackup() async {
    List<Map<String, dynamic>> boxDump(Iterable<Map> values) => [
          for (final v in values) Map<String, dynamic>.from(v),
        ];

    final payload = {
      'app': 'SubTrakr',
      'backupVersion': 1,
      'exportedAt': DateTime.now().toIso8601String(),
      'entities': boxDump(LocalDataSource.entities.values),
      'subscriptions': boxDump(LocalDataSource.subscriptions.values),
      'paymentHistory': boxDump(LocalDataSource.paymentHistory.values),
      'invoices': boxDump(LocalDataSource.invoices.values),
    };

    final bytes = Uint8List.fromList(
      utf8.encode(const JsonEncoder.withIndent('  ').convert(payload)),
    );
    final stamp = DateTime.now().toIso8601String().split('T').first;
    await ExportService.shareBytes(
      bytes: bytes,
      fileName: 'subtrakr-backup-$stamp.json',
      mimeType: 'application/json',
    );
  }
}
