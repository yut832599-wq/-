// 元件化：一個定義、多次使用（props 傳入資料、emits 回報事件）
const PlantCard = {
  props: { plant: { type: Object, required: true }, selected: { type: Boolean, default: false } },
  emits: ['toggle'],
  template: `
    <article class="card">
      <h3>{{ plant.name }}</h3>
      <p class="tag">{{ plant.cat }}・{{ plant.level }}</p>
      <p>{{ plant.desc }}</p>
      <p class="tag">光線：{{ plant.light }}<br>澆水：{{ plant.water }}</p>
      <p>{{ plant.price }} 元</p>
      <button type="button" :disabled="!plant.open" :aria-pressed="selected" @click="$emit('toggle', plant.id)">
        {{ !plant.open ? '目前無現貨' : selected ? '已加入清單（再按取消）' : '加入清單' }}
      </button>
    </article>`
};
