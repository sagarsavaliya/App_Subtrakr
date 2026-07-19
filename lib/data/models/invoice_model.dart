import 'package:equatable/equatable.dart';

/// Invoice file bytes are stored base64-encoded in Hive so the same model
/// works identically on web (no filesystem) and mobile — no platform branch
/// needed. Fine for MVP-sized PDFs/images (PRD caps attachments at 10MB).
class InvoiceModel extends Equatable {
  const InvoiceModel({
    required this.id,
    required this.subscriptionId,
    required this.fileName,
    required this.invoiceDate,
    required this.sizeBytes,
    required this.base64Data,
  });

  final String id;
  final String subscriptionId;
  final String fileName;
  final DateTime invoiceDate;
  final int sizeBytes;
  final String base64Data;

  String get sizeLabel {
    if (sizeBytes < 1024) return '$sizeBytes B';
    final kb = sizeBytes / 1024;
    if (kb < 1024) return '${kb.toStringAsFixed(0)} KB';
    return '${(kb / 1024).toStringAsFixed(1)} MB';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'subscriptionId': subscriptionId,
    'fileName': fileName,
    'invoiceDate': invoiceDate.toIso8601String(),
    'sizeBytes': sizeBytes,
    'base64Data': base64Data,
  };

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id'] as String,
      subscriptionId: json['subscriptionId'] as String,
      fileName: json['fileName'] as String,
      invoiceDate: DateTime.parse(json['invoiceDate'] as String),
      sizeBytes: json['sizeBytes'] as int,
      base64Data: json['base64Data'] as String,
    );
  }

  @override
  List<Object?> get props => [id, subscriptionId, fileName, invoiceDate, sizeBytes];
}
