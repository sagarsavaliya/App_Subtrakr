import 'package:equatable/equatable.dart';

enum EntityType { personal, company }

class EntityModel extends Equatable {
  const EntityModel({
    required this.id,
    required this.name,
    required this.type,
    this.gstNumber,
  });

  final String id;
  final String name;
  final EntityType type;
  final String? gstNumber;

  bool get isCompany => type == EntityType.company;
  bool get hasGst => gstNumber != null && gstNumber!.isNotEmpty;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'type': type.name,
    'gstNumber': gstNumber,
  };

  factory EntityModel.fromJson(Map<String, dynamic> json) {
    return EntityModel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: EntityType.values.byName(json['type'] as String),
      gstNumber: json['gstNumber'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, name, type, gstNumber];
}
