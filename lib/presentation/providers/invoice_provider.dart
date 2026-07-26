import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/invoice_model.dart';
import '../../data/repositories/invoice_repository.dart';

class InvoicesNotifier extends Notifier<List<InvoiceModel>> {
  final _repo = InvoiceRepository();

  @override
  List<InvoiceModel> build() => _repo.getAll();

  Future<void> add(InvoiceModel invoice) async {
    state = [...state, invoice];
    await _repo.save(invoice);
  }

  Future<void> removeById(String id) async {
    state = state.where((i) => i.id != id).toList();
    await _repo.delete(id);
  }
}

final invoicesProvider = NotifierProvider<InvoicesNotifier, List<InvoiceModel>>(
  InvoicesNotifier.new,
);

final invoicesForSubscriptionProvider = Provider.family<List<InvoiceModel>, String>((
  ref,
  subscriptionId,
) {
  final all = ref.watch(invoicesProvider);
  final list = all.where((i) => i.subscriptionId == subscriptionId).toList()
    ..sort((a, b) => b.invoiceDate.compareTo(a.invoiceDate));
  return list;
});
