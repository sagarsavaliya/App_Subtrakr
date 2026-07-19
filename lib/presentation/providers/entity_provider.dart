import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import '../../data/models/entity_model.dart';
import '../../data/repositories/entity_repository.dart';

class EntitiesNotifier extends Notifier<List<EntityModel>> {
  final _repo = EntityRepository();

  @override
  List<EntityModel> build() {
    // Hive doesn't guarantee insertion order (esp. on the web/IndexedDB
    // backend) — pin Personal first to match the approved chip order.
    final all = _repo.getAll();
    return [
      ...all.where((e) => e.type == EntityType.personal),
      ...all.where((e) => e.type == EntityType.company),
    ];
  }

  void add(EntityModel entity) {
    state = [...state, entity];
    _repo.save(entity);
  }
}

final entitiesProvider = NotifierProvider<EntitiesNotifier, List<EntityModel>>(
  EntitiesNotifier.new,
);

/// null = "All" filter selected on the dashboard.
final selectedEntityIdProvider = StateProvider<String?>((ref) => null);
