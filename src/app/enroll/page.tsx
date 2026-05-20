import EnrollmentForm from '@/components/forms/EnrollmentForm';

export const metadata = {
  title: 'オンライン入会お手続き | Swim Partners',
  description: 'Swim Partners のオンライン入会お手続きフォームです。ご希望のプランを選択し、利用規約に同意の上、クレジットカード決済登録へお進みください。',
};

export default function EnrollPage() {
  return <EnrollmentForm />;
}
