import { query } from './src/config/database/postgres.js';
query("SELECT prosrc FROM pg_proc WHERE proname = 'get_teacher_timetables'")
  .then(res => console.log(res.rows[0].prosrc))
  .catch(console.error)
  .finally(() => process.exit(0));
