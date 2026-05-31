exports.up = async (knex) => {
  await knex.schema.createTable('notes', (table) => {
    table.increments('id').primary();
    table.string('title', 255).notNullable().defaultTo('無題');
    table.text('content').defaultTo('');
    table.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('notes');
};
