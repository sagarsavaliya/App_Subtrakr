import '../datasources/local_datasource.dart';
import '../models/invoice_model.dart';

class InvoiceRepository {
  List<InvoiceModel> getAll() {
    return LocalDataSource.invoices.values
        .map((raw) => InvoiceModel.fromJson(Map<String, dynamic>.from(raw)))
        .toList();
  }

  Future<void> save(InvoiceModel invoice) {
    return LocalDataSource.invoices.put(invoice.id, invoice.toJson());
  }

  Future<void> delete(String id) {
    return LocalDataSource.invoices.delete(id);
  }
}
