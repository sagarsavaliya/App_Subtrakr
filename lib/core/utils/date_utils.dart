import 'package:intl/intl.dart';

class AppDateUtils {
  AppDateUtils._();

  static final _dayMonth = DateFormat('d MMM yyyy');

  static String formatDate(DateTime date) => _dayMonth.format(date);

  static String greetingDate(DateTime date) =>
      DateFormat('EEEE, d MMMM').format(date).toUpperCase();

  /// e.g. "Due in 2 days", "Overdue 1 day", "Due today"
  static String dueLabel(DateTime dueDate) {
    final days = dueDate.difference(DateTime.now()).inDays;
    if (days < 0) {
      return 'Overdue ${days.abs()} day${days.abs() == 1 ? '' : 's'}';
    }
    if (days == 0) return 'Due today';
    return 'Due in $days day${days == 1 ? '' : 's'}';
  }

  static String timeOfDayGreeting(DateTime now) {
    final hour = now.hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
