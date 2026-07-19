import '../datasources/local_datasource.dart';
import '../models/entity_model.dart';

class EntityRepository {
  List<EntityModel> getAll() {
    return LocalDataSource.entities.values
        .map((raw) => EntityModel.fromJson(Map<String, dynamic>.from(raw)))
        .toList();
  }

  Future<void> save(EntityModel entity) {
    return LocalDataSource.entities.put(entity.id, entity.toJson());
  }

  Future<void> delete(String id) {
    return LocalDataSource.entities.delete(id);
  }

  Future<void> seedIfEmpty(List<EntityModel> seed) async {
    if (LocalDataSource.entities.isNotEmpty) return;
    for (final entity in seed) {
      await save(entity);
    }
  }
}
